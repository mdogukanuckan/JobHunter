using System.Text.Json;
using System.Text.Json.Serialization;
using JobHunter.Application.Automation.Dtos;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobHunter.Application.Automation.Telegram;

public class TelegramApprovalService : ITelegramApprovalService
{
    private const string Channel = "telegram";

    private static readonly JsonSerializerOptions StateJson = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly IApplicationDbContext _context;
    private readonly ITelegramGateway _gateway;
    private readonly IAutomationChannelService _channelService;
    private readonly TelegramOptions _options;
    private readonly ILogger<TelegramApprovalService> _logger;

    public TelegramApprovalService(
        IApplicationDbContext context,
        ITelegramGateway gateway,
        IAutomationChannelService channelService,
        TelegramOptions options,
        ILogger<TelegramApprovalService> logger)
    {
        _context = context;
        _gateway = gateway;
        _channelService = channelService;
        _options = options;
        _logger = logger;
    }

    public async Task StartPendingConversationsAsync(CancellationToken cancellationToken = default)
    {
        var chatId = RequireChatId();

        var pending = await _context.AutomationJobs
            .Include(j => j.JobApplication)
            .Where(j => j.Status == AutomationJobStatus.AwaitingApproval
                        && j.ReviewReportJson != null
                        && j.TelegramConversationJson == null)
            .ToListAsync(cancellationToken);

        foreach (var job in pending)
        {
            try
            {
                using var report = JsonDocument.Parse(job.ReviewReportJson!);
                var (state, turn) = TelegramConversation.Start(
                    job.JobApplication.CompanyName, job.JobApplication.JobTitle, report.RootElement);

                // Once gonder, sonra durumu kaydet: gonderim basarisizsa durum bos kalir ve bir sonraki turda tekrar denenir.
                await SendRepliesAsync(chatId, job.Id, turn.Replies, cancellationToken);
                await SaveStateAsync(job, state, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Telegram konusmasi baslatilamadi (is {JobId}).", job.Id);
            }
        }
    }

    public async Task HandleUpdateAsync(TelegramUpdate update, CancellationToken cancellationToken = default)
    {
        var chatId = RequireChatId();

        if (update.ChatId != chatId)
        {
            // Icerigi loglama: yabanci bir sohbetten gelen mesaj olabilir.
            _logger.LogWarning("Yapilandirilmamis bir Telegram sohbetinden mesaj yok sayildi.");
            return;
        }

        if (update.CallbackId is not null)
            await _gateway.AnswerCallbackAsync(update.CallbackId, cancellationToken);

        if (update.CallbackData is not null)
        {
            await HandleButtonAsync(chatId, update.CallbackData, cancellationToken);
            return;
        }

        if (string.IsNullOrWhiteSpace(update.Text)) return;

        if (update.Text.StartsWith('/'))
        {
            await _gateway.SendMessageAsync(chatId,
                "Komutlar desteklenmiyor. Onay bekleyen bir başvuru varsa sorunun cevabını yazın.", null, cancellationToken);
            return;
        }

        var job = await _context.AutomationJobs
            .Include(j => j.JobApplication)
            .Where(j => j.Status == AutomationJobStatus.AwaitingApproval && j.TelegramConversationJson != null)
            .OrderByDescending(j => j.UpdatedAt ?? j.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (job is null)
        {
            await _gateway.SendMessageAsync(chatId, "Şu an cevap bekleyen bir başvuru yok.", null, cancellationToken);
            return;
        }

        var state = Load(job);
        var turn = TelegramConversation.HandleText(state, update.Text);
        await SaveStateAsync(job, state, cancellationToken);
        await SendRepliesAsync(chatId, job.Id, turn.Replies, cancellationToken);
    }

    private async Task HandleButtonAsync(long chatId, string callbackData, CancellationToken cancellationToken)
    {
        // Veri: "<isId N bicimi>:<eylem>" (Telegram 64 bayt sinirina sigar).
        var parts = callbackData.Split(':', 2);
        if (parts.Length != 2 || !Guid.TryParseExact(parts[0], "N", out var jobId))
            return;
        var action = parts[1];

        var job = await _context.AutomationJobs
            .Include(j => j.JobApplication)
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

        if (job is null || job.Status != AutomationJobStatus.AwaitingApproval || job.TelegramConversationJson is null)
        {
            await _gateway.SendMessageAsync(chatId, "Bu başvuru artık onay beklemiyor.", null, cancellationToken);
            return;
        }

        var state = Load(job);
        var turn = TelegramConversation.HandleButton(state, action);

        if (turn.Action == TelegramAction.None)
        {
            await SaveStateAsync(job, state, cancellationToken);
            await SendRepliesAsync(chatId, job.Id, turn.Replies, cancellationToken);
            return;
        }

        await SendRepliesAsync(chatId, job.Id, turn.Replies, cancellationToken);
        await ApplyActionAsync(chatId, job, state, turn.Action, cancellationToken);
    }

    private async Task ApplyActionAsync(
        long chatId, AutomationJob job, TelegramConversationState state, TelegramAction action, CancellationToken cancellationToken)
    {
        try
        {
            if (action == TelegramAction.Approve)
            {
                var answers = TelegramConversation.ApprovalAnswers(state);
                var element = answers is null ? (JsonElement?)null : JsonSerializer.SerializeToElement(answers);
                await _channelService.ApproveFromChannelAsync(
                    job.Id, new ApproveAutomationRequest(element, TelegramConversation.KvkkAccepted(state)), Channel, cancellationToken);
            }
            else
            {
                await _channelService.CancelFromChannelAsync(job.Id, "Kullanici Telegram'dan iptal etti", Channel, cancellationToken);
            }
        }
        catch (Exception ex) when (ex is AutomationConflictException or BusinessValidationException or KeyNotFoundException)
        {
            // Beklenen is hatalari (orn. is arada uygulamadan onaylandi/iptal edildi): kullaniciya anlasilir mesaj.
            await _gateway.SendMessageAsync(chatId, $"⚠️ {ex.Message}", null, cancellationToken);
        }
    }

    private async Task SendRepliesAsync(long chatId, Guid jobId, IReadOnlyList<TelegramReply> replies, CancellationToken cancellationToken)
    {
        foreach (var reply in replies)
        {
            var buttons = reply.Buttons?.Select(b => new TelegramButton(b.Text, $"{jobId:N}:{b.Data}")).ToList();
            await _gateway.SendMessageAsync(chatId, reply.Text, buttons, cancellationToken);
        }
    }

    private async Task SaveStateAsync(AutomationJob job, TelegramConversationState state, CancellationToken cancellationToken)
    {
        job.TelegramConversationJson = JsonSerializer.Serialize(state, StateJson);
        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static TelegramConversationState Load(AutomationJob job)
        => JsonSerializer.Deserialize<TelegramConversationState>(job.TelegramConversationJson!, StateJson)
           ?? throw new InvalidOperationException("Telegram konusma durumu okunamadi.");

    private long RequireChatId()
        => _options.ChatId ?? throw new InvalidOperationException("Telegram:ChatId yapilandirilmamis.");
}

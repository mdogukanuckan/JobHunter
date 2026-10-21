using JobHunter.Application.Automation.Telegram;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JobHunter.Infrastructure.Automation;

/// <summary>
/// Telegram'i dinleyen arka plan servisi. Backend localhost'ta calistigi icin Telegram bize webhook ile
/// ulasamaz; bu yuzden getUpdates (kisa long polling) kullanilir. Her turda once onay bekleyen yeni
/// denemeler icin ilk soru gonderilir, sonra gelen mesajlar islenir.
///
/// Acilista bekleyen eski guncellemeler ATLANIR: backend kapaliyken yazilmis bir mesaj, yeni acilan bir
/// konusmaya yanlislikla "cevap" olarak islenmesin.
/// </summary>
public class TelegramPollingService : BackgroundService
{
    private const int PollTimeoutSeconds = 5;
    private static readonly TimeSpan ErrorDelay = TimeSpan.FromSeconds(10);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TelegramPollingService> _logger;

    public TelegramPollingService(IServiceScopeFactory scopeFactory, ILogger<TelegramPollingService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Telegram dinleyicisi basladi.");
        long? offset = null;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var gateway = scope.ServiceProvider.GetRequiredService<ITelegramGateway>();

                if (offset is null)
                {
                    var latest = await gateway.GetUpdatesAsync(-1, 0, stoppingToken);
                    offset = latest.Count > 0 ? latest.Max(u => u.UpdateId) + 1 : 0;
                }

                var service = scope.ServiceProvider.GetRequiredService<ITelegramApprovalService>();
                await service.StartPendingConversationsAsync(stoppingToken);

                var updates = await gateway.GetUpdatesAsync(offset, PollTimeoutSeconds, stoppingToken);
                foreach (var update in updates)
                {
                    // Offset her halukarda ilerler: hatali bir mesaj sonsuz donguye yol acmasin.
                    offset = update.UpdateId + 1;
                    try
                    {
                        await service.HandleUpdateAsync(update, stoppingToken);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        _logger.LogWarning(ex, "Telegram guncellemesi islenemedi (update {UpdateId}).", update.UpdateId);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Telegram dinleyicisi gecici olarak hata verdi; {Delay} sn sonra tekrar denenecek.", ErrorDelay.TotalSeconds);
                try { await Task.Delay(ErrorDelay, stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }
    }
}

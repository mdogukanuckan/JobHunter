using System.Text.Json;
using JobHunter.Application.Automation.Dtos;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Cvs.Dtos;
using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Automation.Services;

public class AutomationCallbackService : IAutomationCallbackService
{
    private const int MaxEventDataChars = 64 * 1024;

    private readonly IApplicationDbContext _context;
    private readonly IFileStorage _fileStorage;
    private readonly IAutomationPayloadBuilder _payloadBuilder;

    public AutomationCallbackService(IApplicationDbContext context, IFileStorage fileStorage, IAutomationPayloadBuilder payloadBuilder)
    {
        _context = context;
        _fileStorage = fileStorage;
        _payloadBuilder = payloadBuilder;
    }

    public Task<AutomationPayload> GetPayloadAsync(Guid jobId, CancellationToken cancellationToken = default)
        => _payloadBuilder.BuildAsync(jobId, cancellationToken);

    public async Task<CvFileResult> GetCvAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        var cv = await _context.AutomationJobs
            .AsNoTracking()
            .Where(j => j.Id == jobId)
            .Select(j => j.Cv)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Bu denemeye bagli CV yok (veya is bulunamadi).");

        var stream = await _fileStorage.OpenReadAsync(cv.StorageKey, cancellationToken)
            ?? throw new KeyNotFoundException("CV dosyasi depolamada bulunamadi.");

        return new CvFileResult(stream, cv.ContentType, cv.OriginalFileName);
    }

    public async Task<AutomationJobResponse> UpdateStatusAsync(Guid jobId, UpdateAutomationStatusRequest request, CancellationToken cancellationToken = default)
    {
        var job = await FindAsync(jobId, cancellationToken);

        var changed = AutomationWorkflow.ChangeStatus(_context, job, request.Status, request.Message, "n8n",
            request.ErrorMessage, request.ResultSummary);
        if (changed) await _context.SaveChangesAsync(cancellationToken);

        return AutomationMappings.ToResponse(job, includeEvents: false);
    }

    public async Task<AutomationEventResponse> AddEventAsync(Guid jobId, AddAutomationEventRequest request, CancellationToken cancellationToken = default)
    {
        var job = await FindAsync(jobId, cancellationToken);

        string? dataJson = null;
        if (request.Data is { ValueKind: not JsonValueKind.Null and not JsonValueKind.Undefined } data)
        {
            dataJson = data.GetRawText();
            if (dataJson.Length > MaxEventDataChars)
                throw new BusinessValidationException($"'data' en fazla {MaxEventDataChars / 1024} KB olabilir.");
        }

        // Bitmis islere de olay eklenebilir (orn. is bittikten sonra son ekran goruntusu linki).
        var e = AutomationWorkflow.AddEvent(_context, job, request.Level,
            AutomationWorkflow.Clean(request.Step), request.Message.Trim(), dataJson);
        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return AutomationMappings.ToResponse(e);
    }

    // ---- Faz 11: onay ekrani ----

    public async Task<AutomationJobResponse> SubmitReviewAsync(Guid jobId, SubmitAutomationReviewRequest request, CancellationToken cancellationToken = default)
    {
        var job = await FindAsync(jobId, cancellationToken);

        job.ReviewReportJson = request.Report.GetRawText();
        job.UpdatedAt = DateTime.UtcNow;
        AutomationWorkflow.AddEvent(_context, job, JobHunter.Domain.Enums.AutomationEventLevel.Info, "review_report",
            "Inceleme raporu kaydedildi.");

        await _context.SaveChangesAsync(cancellationToken);
        return AutomationMappings.ToResponse(job, includeEvents: false);
    }

    public async Task SaveScreenshotAsync(Guid jobId, Stream content, string contentType, CancellationToken cancellationToken = default)
    {
        var job = await FindAsync(jobId, cancellationToken);

        var extension = contentType.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase) ? ".jpg" : ".png";
        var newKey = await _fileStorage.SaveAsync(content, extension, cancellationToken);

        var oldKey = job.ReviewScreenshotKey;
        job.ReviewScreenshotKey = newKey;
        job.UpdatedAt = DateTime.UtcNow;
        AutomationWorkflow.AddEvent(_context, job, JobHunter.Domain.Enums.AutomationEventLevel.Info, "review_screenshot",
            "Inceleme ekran goruntusu kaydedildi.");

        await _context.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(oldKey))
            await _fileStorage.DeleteAsync(oldKey, cancellationToken);
    }

    public async Task<AutomationApprovalAnswersResponse> GetApprovalAnswersAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        var job = await FindAsync(jobId, cancellationToken);

        JsonElement? answers = job.ApprovalAnswersJson is null
            ? null
            : JsonDocument.Parse(job.ApprovalAnswersJson).RootElement.Clone();

        return new AutomationApprovalAnswersResponse(answers, job.KvkkAccepted);
    }

        private async Task<AutomationJob> FindAsync(Guid jobId, CancellationToken cancellationToken)
        => await _context.AutomationJobs
               .Include(j => j.JobApplication)
               .Include(j => j.Cv)
               .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken)
           ?? throw new KeyNotFoundException("Otomasyon isi bulunamadi.");
}

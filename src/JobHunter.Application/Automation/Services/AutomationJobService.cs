using JobHunter.Application.Automation.Dtos;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Domain.Automation;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace JobHunter.Application.Automation.Services;

public class AutomationJobService : IAutomationJobService
{
    private const int MaxListSize = 200;

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAutomationDispatcher _dispatcher;
    private readonly IAutomationPayloadBuilder _payloadBuilder;
    private readonly IFileStorage _fileStorage;
    private readonly AutomationOptions _options;
    private readonly ILogger<AutomationJobService> _logger;

    public AutomationJobService(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IAutomationDispatcher dispatcher,
        IAutomationPayloadBuilder payloadBuilder,
        IFileStorage fileStorage,
        AutomationOptions options,
        ILogger<AutomationJobService> logger)
    {
        _context = context;
        _currentUser = currentUser;
        _dispatcher = dispatcher;
        _payloadBuilder = payloadBuilder;
        _fileStorage = fileStorage;
        _options = options;
        _logger = logger;
    }

    public async Task<AutomationJobResponse> StartAsync(Guid jobApplicationId, StartAutomationRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var application = await _context.JobApplications
            .Include(a => a.Cv)
            .FirstOrDefaultAsync(a => a.Id == jobApplicationId && a.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Basvuru bulunamadi.");

        if (string.IsNullOrWhiteSpace(application.JobUrl))
            throw new BusinessValidationException("Otomasyon icin basvurunun ilan linki (JobUrl) dolu olmali.");

        // Ayni basvuruda ayni anda iki deneme olursa ayni forma iki kez basvurulabilir.
        var hasActive = await _context.AutomationJobs.AnyAsync(
            j => j.JobApplicationId == application.Id && AutomationJobTransitions.ActiveStatuses.Contains(j.Status),
            cancellationToken);
        if (hasActive)
            throw new AutomationConflictException("Bu basvuru icin zaten devam eden bir otomasyon var. Once onu iptal et veya bitmesini bekle.");

        // CV secimi: basvuruya bagli CV (silinmemisse), yoksa profildeki varsayilan CV.
        var cv = application.Cv is { IsDeleted: false } ? application.Cv : null;
        if (cv is null)
        {
            cv = await _context.CandidateProfiles
                .Where(p => p.UserId == userId && p.DefaultCv != null && !p.DefaultCv.IsDeleted)
                .Select(p => p.DefaultCv)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var lastAttempt = await _context.AutomationJobs
            .Where(j => j.JobApplicationId == application.Id)
            .MaxAsync(j => (int?)j.AttemptNumber, cancellationToken) ?? 0;

        var job = new AutomationJob
        {
            JobApplicationId = application.Id,
            JobApplication = application,
            AttemptNumber = lastAttempt + 1,
            Mode = request.Mode,
            Status = AutomationJobStatus.Queued,
            CvId = cv?.Id,
            Cv = cv
        };
        _context.AutomationJobs.Add(job);

        AutomationWorkflow.AddEvent(_context, job, AutomationEventLevel.Info, "queued",
            $"Deneme #{job.AttemptNumber} kuyruga alindi ({job.Mode}). CV: {cv?.Name ?? "yok"}.");
        if (cv is null)
            AutomationWorkflow.AddEvent(_context, job, AutomationEventLevel.Warning, "queued",
                "CV secilmedi: basvuruda ve profilde varsayilan CV yok. Form CV isterse is onaya dusecek.");

        // Once kaydet, sonra n8n'e haber ver: n8n hemen geri cagirirsa is veritabaninda hazir olmali.
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _dispatcher.DispatchAsync(new AutomationDispatchMessage(
                job.Id, application.Id, job.AttemptNumber, job.Mode,
                application.CompanyName, application.JobTitle, application.JobUrl,
                _options.BuildUrl(AutomationCallbackPaths.Payload(job.Id)),
                _options.BuildUrl(AutomationCallbackPaths.Status(job.Id)),
                _options.BuildUrl(AutomationCallbackPaths.Events(job.Id)),
                AutomationDispatchPhase.Fill,
                _options.BuildUrl(AutomationCallbackPaths.Review(job.Id)),
                _options.BuildUrl(AutomationCallbackPaths.Screenshot(job.Id)),
                _options.BuildUrl(AutomationCallbackPaths.ApprovalAnswers(job.Id))),
                cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // n8n'e ulasilamadiysa is sonsuza kadar Queued kalmasin: Failed olur, kullanici tekrar dener (yeni deneme).
            _logger.LogWarning(ex, "Otomasyon isi {JobId} n8n'e iletilemedi.", job.Id);
            AutomationWorkflow.ChangeStatus(_context, job, AutomationJobStatus.Failed, null, "system",
                errorMessage: $"n8n'e iletilemedi: {ex.Message}");
            await _context.SaveChangesAsync(cancellationToken);
        }

        return AutomationMappings.ToResponse(job, includeEvents: true);
    }

    public async Task<IReadOnlyList<AutomationJobResponse>> GetAllAsync(Guid? jobApplicationId, AutomationJobStatus? status, CancellationToken cancellationToken = default)
    {
        var query = OwnedJobs().AsNoTracking();
        if (jobApplicationId is { } appId) query = query.Where(j => j.JobApplicationId == appId);
        if (status is { } s) query = query.Where(j => j.Status == s);

        var items = await query
            .OrderByDescending(j => j.CreatedAt)
            .Take(MaxListSize)
            .ToListAsync(cancellationToken);

        return items.Select(j => AutomationMappings.ToResponse(j, includeEvents: false)).ToList();
    }

    public async Task<AutomationJobResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var job = await OwnedJobs()
            .AsNoTracking()
            .Include(j => j.Events)
            .FirstOrDefaultAsync(j => j.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Otomasyon isi bulunamadi.");

        return AutomationMappings.ToResponse(job, includeEvents: true);
    }

    public async Task<AutomationJobResponse> CancelAsync(Guid id, CancelAutomationRequest request, CancellationToken cancellationToken = default)
    {
        var job = await OwnedJobs()
            .Include(j => j.Events)
            .FirstOrDefaultAsync(j => j.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Otomasyon isi bulunamadi.");

        // Not: n8n calisiyorsa bunu bir sonraki callback'inde 409 alarak ogrenir ve durur (bkz. README).
        AutomationWorkflow.ChangeStatus(_context, job, AutomationJobStatus.Cancelled,
            request.Reason ?? "Kullanici iptal etti", "user");
        await _context.SaveChangesAsync(cancellationToken);

        return AutomationMappings.ToResponse(job, includeEvents: true);
    }

    public async Task<AutomationPayload> GetPayloadPreviewAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var exists = await OwnedJobs().AnyAsync(j => j.Id == id, cancellationToken);
        if (!exists) throw new KeyNotFoundException("Otomasyon isi bulunamadi.");

        return await _payloadBuilder.BuildAsync(id, cancellationToken);
    }

    // ---- Faz 11: onay ekrani ----

    public async Task<AutomationReviewResponse> GetReviewAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var job = await OwnedJobs().AsNoTracking().FirstOrDefaultAsync(j => j.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Otomasyon isi bulunamadi.");

        JsonElement? report = job.ReviewReportJson is null
            ? null
            : JsonDocument.Parse(job.ReviewReportJson).RootElement.Clone();

        return new AutomationReviewResponse(report, !string.IsNullOrWhiteSpace(job.ReviewScreenshotKey));
    }

    public async Task<JobHunter.Application.Cvs.Dtos.CvFileResult> GetReviewScreenshotAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var key = await OwnedJobs().AsNoTracking()
            .Where(j => j.Id == id)
            .Select(j => j.ReviewScreenshotKey)
            .FirstOrDefaultAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(key))
            throw new KeyNotFoundException("Bu denemeye ait inceleme ekran goruntusu yok (veya is bulunamadi).");

        var stream = await _fileStorage.OpenReadAsync(key, cancellationToken)
            ?? throw new KeyNotFoundException("Ekran goruntusu dosyasi depolamada bulunamadi.");

        var contentType = key.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ? "image/jpeg" : "image/png";
        return new JobHunter.Application.Cvs.Dtos.CvFileResult(stream, contentType, "onay-ekrani" + Path.GetExtension(key));
    }

    public async Task<AutomationJobResponse> ApproveAsync(Guid id, ApproveAutomationRequest request, CancellationToken cancellationToken = default)
    {
        var job = await OwnedJobs()
            .Include(j => j.Events)
            .FirstOrDefaultAsync(j => j.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Otomasyon isi bulunamadi.");

        if (job.Status != AutomationJobStatus.AwaitingApproval)
            throw new AutomationConflictException($"Bu is su an onay bekliyor degil ({job.Status}); onaylanamaz.");

        if (!request.KvkkAccepted)
            throw new BusinessValidationException("KVKK / aydinlatma metni onay kutusu isaretlenmeli.");

        job.ApprovalAnswersJson = request.Answers?.GetRawText();
        job.KvkkAccepted = true;

        // Cevaplarin kendisi (TC kimlik dahil olabilir) gunluge YAZILMAZ, sadece kac tane geldigi.
        var answerCount = request.Answers is { ValueKind: JsonValueKind.Object } obj ? obj.EnumerateObject().Count() : 0;
        AutomationWorkflow.AddEvent(_context, job, AutomationEventLevel.Info, "approved",
            $"Kullanici onayladi ({answerCount} cevap girildi). Gonderim icin n8n'e iletiliyor.");

        AutomationWorkflow.ChangeStatus(_context, job, AutomationJobStatus.Running,
            "Onaylandi, gonderim baslatiliyor.", "user");

        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _dispatcher.DispatchAsync(new AutomationDispatchMessage(
                job.Id, job.JobApplicationId, job.AttemptNumber, job.Mode,
                job.JobApplication.CompanyName, job.JobApplication.JobTitle, job.JobApplication.JobUrl,
                _options.BuildUrl(AutomationCallbackPaths.Payload(job.Id)),
                _options.BuildUrl(AutomationCallbackPaths.Status(job.Id)),
                _options.BuildUrl(AutomationCallbackPaths.Events(job.Id)),
                AutomationDispatchPhase.Submit,
                _options.BuildUrl(AutomationCallbackPaths.Review(job.Id)),
                _options.BuildUrl(AutomationCallbackPaths.Screenshot(job.Id)),
                _options.BuildUrl(AutomationCallbackPaths.ApprovalAnswers(job.Id))),
                cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Onay sonrasi gonderim isi {JobId} n8n'e iletilemedi.", job.Id);
            AutomationWorkflow.ChangeStatus(_context, job, AutomationJobStatus.Failed, null, "system",
                errorMessage: $"n8n'e iletilemedi: {ex.Message}");
            await _context.SaveChangesAsync(cancellationToken);
        }

        return AutomationMappings.ToResponse(job, includeEvents: true);
    }

        /// <summary>Sadece kullanicinin kendi basvurularina ait denemeler (sahiplik basvuru uzerinden).</summary>
    private IQueryable<AutomationJob> OwnedJobs()
    {
        var userId = _currentUser.GetRequiredUserId();
        return _context.AutomationJobs
            .Include(j => j.JobApplication)
            .Include(j => j.Cv)
            .Where(j => j.JobApplication.UserId == userId);
    }
}

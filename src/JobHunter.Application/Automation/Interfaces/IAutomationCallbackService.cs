using JobHunter.Application.Automation.Dtos;
using JobHunter.Application.Cvs.Dtos;

namespace JobHunter.Application.Automation.Interfaces;

/// <summary>
/// n8n'in (API anahtariyla) cagirdigi islemler. Kullanici oturumu yoktur: is, Id'si ile bulunur
/// ve sahibi basvuru uzerinden belirlenir. Is yoksa KeyNotFoundException.
/// </summary>
public interface IAutomationCallbackService
{
    Task<AutomationPayload> GetPayloadAsync(Guid jobId, CancellationToken cancellationToken = default);

    /// <summary>Bu denemeye sabitlenmis CV dosyasi. CV yoksa KeyNotFoundException.</summary>
    Task<CvFileResult> GetCvAsync(Guid jobId, CancellationToken cancellationToken = default);

    /// <summary>Gecersiz gecis (orn. iptal edilmis is → Running) AutomationConflictException.</summary>
    Task<AutomationJobResponse> UpdateStatusAsync(Guid jobId, UpdateAutomationStatusRequest request, CancellationToken cancellationToken = default);

    Task<AutomationEventResponse> AddEventAsync(Guid jobId, AddAutomationEventRequest request, CancellationToken cancellationToken = default);

    // ---- Faz 11: onay ekrani ----

    /// <summary>Doldurma turunun (Fill) inceleme raporunu kaydeder.</summary>
    Task<AutomationJobResponse> SubmitReviewAsync(Guid jobId, SubmitAutomationReviewRequest request, CancellationToken cancellationToken = default);

    /// <summary>Inceleme ekran goruntusunu kaydeder (IFileStorage).</summary>
    Task SaveScreenshotAsync(Guid jobId, Stream content, string contentType, CancellationToken cancellationToken = default);

    /// <summary>Submit turunda worker'in okuyacagi onay cevaplari + KVKK durumu.</summary>
    Task<AutomationApprovalAnswersResponse> GetApprovalAnswersAsync(Guid jobId, CancellationToken cancellationToken = default);
}

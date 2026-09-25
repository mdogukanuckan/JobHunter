using JobHunter.Application.Automation.Dtos;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Automation.Interfaces;

/// <summary>Kullanicinin (JWT) otomasyon islemleri. Sadece kendi basvurularinin denemeleri gorunur.</summary>
public interface IAutomationJobService
{
    /// <summary>
    /// Yeni deneme olusturur (Queued) ve n8n'e bildirir.
    /// Basvuru yoksa KeyNotFoundException; ilan linki yoksa BusinessValidationException;
    /// zaten aktif bir deneme varsa AutomationConflictException.
    /// </summary>
    Task<AutomationJobResponse> StartAsync(Guid jobApplicationId, StartAutomationRequest request, CancellationToken cancellationToken = default);

    /// <summary>En yeni en ustte. Filtreler opsiyonel.</summary>
    Task<IReadOnlyList<AutomationJobResponse>> GetAllAsync(Guid? jobApplicationId, AutomationJobStatus? status, CancellationToken cancellationToken = default);

    /// <summary>Detay + gunluk.</summary>
    Task<AutomationJobResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Aktif denemeyi iptal eder. Bitmis bir is iptal edilemez (AutomationConflictException).</summary>
    Task<AutomationJobResponse> CancelAsync(Guid id, CancelAutomationRequest request, CancellationToken cancellationToken = default);

    /// <summary>n8n'e gidecek veri paketinin onizlemesi (ne paylasiliyor, kullanici gorebilsin).</summary>
    Task<AutomationPayload> GetPayloadPreviewAsync(Guid id, CancellationToken cancellationToken = default);

    // ---- Faz 11: onay ekrani ----

    /// <summary>AwaitingApproval'daki (ya da bitmis) bir denemenin inceleme raporu.</summary>
    Task<AutomationReviewResponse> GetReviewAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Inceleme ekran goruntusu. Yoksa KeyNotFoundException.</summary>
    Task<JobHunter.Application.Cvs.Dtos.CvFileResult> GetReviewScreenshotAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanici onay ekranindan gonderir: cevaplari + KVKK'yi kaydeder, isi tekrar Running yapar ve
    /// n8n'e Phase=Submit ile bildirir. Is AwaitingApproval'da degilse AutomationConflictException.
    /// </summary>
    Task<AutomationJobResponse> ApproveAsync(Guid id, ApproveAutomationRequest request, CancellationToken cancellationToken = default);
}

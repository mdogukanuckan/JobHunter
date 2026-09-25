using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Automation.Dtos;

// ---------- Kullanici (JWT) istekleri ----------

/// <summary>Otomasyonu baslat. Govde bos gonderilebilir: varsayilan HumanApproval.</summary>
public record StartAutomationRequest(AutomationMode Mode = AutomationMode.HumanApproval);

/// <summary>Iptal. Neden opsiyonel, gunluge yazilir.</summary>
public record CancelAutomationRequest([MaxLength(500)] string? Reason = null);

// ---------- n8n (API anahtari) istekleri ----------

/// <summary>
/// n8n/worker doldurma turunun (Phase: Fill) sonucunu bildirir: inceleme raporu.
/// Serbest JSON olarak saklanir (worker'in filled/skipped alan listeleri); onay ekrani bunu oldugu gibi gosterir.
/// </summary>
public record SubmitAutomationReviewRequest([Required] JsonElement Report);

/// <summary>
/// n8n durum bildirir. Ornek: { "status": "Running", "message": "Ilan sayfasi acildi" }.
/// Ayni durumu tekrar gondermek hata degildir (n8n yeniden denerse sorun cikmasin): degisiklik yapilmaz.
/// Failed icin errorMessage, Completed icin resultSummary doldurulmasi beklenir.
/// </summary>
public record UpdateAutomationStatusRequest(
    AutomationJobStatus Status,
    [MaxLength(2000)] string? Message,
    [MaxLength(2000)] string? ErrorMessage,
    [MaxLength(2000)] string? ResultSummary);

/// <summary>
/// n8n gunluge bir satir ekler. Ornek: { "level": "Info", "step": "upload_cv", "message": "CV yuklendi", "data": { "field": "resume" } }.
/// data: istege bagli, herhangi bir JSON (en fazla 64 KB).
/// </summary>
public record AddAutomationEventRequest(
    AutomationEventLevel Level,
    [MaxLength(100)] string? Step,
    [Required, MaxLength(2000)] string Message,
    JsonElement? Data);

/// <summary>Onay ekraninda kullaniciya gosterilecek inceleme raporu + ekran goruntusu var mi.</summary>
public record AutomationReviewResponse(JsonElement? Report, bool HasScreenshot);

/// <summary>
/// Kullanicinin onay ekranindan gonderdigi cevaplar (TC kimlik dahil olabilir) + KVKK onayi.
/// Serbest JSON: { "fieldName": "deger", ... }. Insan onaylida KvkkAccepted kullanicinin isaretledigi kutu;
/// Otomatik modda backend bunu kendisi true yapar (gunluge uyari yazilir).
/// </summary>
public record ApproveAutomationRequest(JsonElement? Answers, bool KvkkAccepted);

/// <summary>n8n/worker'in Submit turunda okudugu onay cevaplari. Answers null ise onay verilmemis demektir.</summary>
public record AutomationApprovalAnswersResponse(JsonElement? Answers, bool KvkkAccepted);

// ---------- Yanitlar ----------

/// <summary>
/// Bir otomasyon denemesi. Listelerde Events null gelir; detayda (GET /{id}) eskiden yeniye tum gunluk.
/// </summary>
public record AutomationJobResponse(
    Guid Id,
    Guid JobApplicationId,
    string CompanyName,
    string JobTitle,
    int AttemptNumber,
    AutomationMode Mode,
    AutomationJobStatus Status,
    Guid? CvId,
    string? CvName,
    string? ErrorMessage,
    string? ResultSummary,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? FinishedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<AutomationEventResponse>? Events);

public record AutomationEventResponse(
    Guid Id,
    AutomationEventLevel Level,
    string? Step,
    string Message,
    JsonElement? Data,
    DateTime CreatedAt);

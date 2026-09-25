using JobHunter.Application.Automation;
using JobHunter.Application.Automation.Dtos;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Exceptions;
using JobHunter.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace JobHunter.API.Controllers;

/// <summary>
/// Kullanicinin otomasyon islemleri (JWT). Otomasyonu baslatir, izler, iptal eder.
/// n8n'in cagirdigi endpoint'ler ayri: AutomationCallbackController.
/// </summary>
[ApiController]
[Authorize]
[Route("api/automation-jobs")]
public class AutomationJobsController : ControllerBase
{
    private readonly IAutomationJobService _service;

    public AutomationJobsController(IAutomationJobService service)
    {
        _service = service;
    }

    /// <summary>
    /// Basvuru icin yeni otomasyon denemesi baslatir (Queued) ve n8n'e bildirir.
    /// Govde opsiyonel: { "mode": "HumanApproval" | "Automatic" }. 409: zaten devam eden deneme var.
    /// </summary>
    [HttpPost("/api/job-applications/{jobApplicationId:guid}/automation-jobs")]
    public async Task<ActionResult<AutomationJobResponse>> Start(
        Guid jobApplicationId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] StartAutomationRequest? request,
        CancellationToken ct)
    {
        var result = await Handle(() => _service.StartAsync(jobApplicationId, request ?? new StartAutomationRequest(), ct));
        return result.Result is OkObjectResult { Value: AutomationJobResponse job }
            ? CreatedAtAction(nameof(GetById), new { id = job.Id }, job)
            : result;
    }

    /// <summary>Denemeler, en yeni en ustte. Filtreler: ?jobApplicationId=...&amp;status=Running</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AutomationJobResponse>>> GetAll(
        [FromQuery] Guid? jobApplicationId, [FromQuery] AutomationJobStatus? status, CancellationToken ct)
        => Ok(await _service.GetAllAsync(jobApplicationId, status, ct));

    /// <summary>Deneme detayi + adim adim gunluk (events).</summary>
    [HttpGet("{id:guid}")]
    public Task<ActionResult<AutomationJobResponse>> GetById(Guid id, CancellationToken ct)
        => Handle(() => _service.GetByIdAsync(id, ct));

    /// <summary>Aktif denemeyi iptal eder. Govde opsiyonel: { "reason": "..." }. 409: is zaten bitmis.</summary>
    [HttpPost("{id:guid}/cancel")]
    public Task<ActionResult<AutomationJobResponse>> Cancel(
        Guid id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelAutomationRequest? request,
        CancellationToken ct)
        => Handle(() => _service.CancelAsync(id, request ?? new CancelAutomationRequest(), ct));

    /// <summary>n8n'e verilecek veri paketinin onizlemesi: hangi bilgiler paylasiliyor, hangileri gizli (Never).</summary>
    [HttpGet("{id:guid}/payload")]
    public Task<ActionResult<AutomationPayload>> GetPayload(Guid id, CancellationToken ct)
        => Handle(() => _service.GetPayloadPreviewAsync(id, ct));

    // ---- Faz 11: onay ekrani ----

    /// <summary>Onay ekraninda gosterilecek inceleme raporu (worker'in doldurma turu ciktisi).</summary>
    [HttpGet("{id:guid}/review")]
    public Task<ActionResult<AutomationReviewResponse>> GetReview(Guid id, CancellationToken ct)
        => Handle(() => _service.GetReviewAsync(id, ct));

    /// <summary>Inceleme ekran goruntusu (resim).</summary>
    [HttpGet("{id:guid}/review-screenshot")]
    public async Task<IActionResult> GetReviewScreenshot(Guid id, CancellationToken ct)
    {
        try
        {
            var file = await _service.GetReviewScreenshotAsync(id, ct);
            return File(file.Content, file.ContentType, file.FileName);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Onay ekranindan gonderilir: cevaplari (TC kimlik dahil olabilir) ve KVKK onayini kaydeder,
    /// gonderim icin n8n'e Phase=Submit ile bildirir. 409: is su an onay bekliyor degil.
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    public Task<ActionResult<AutomationJobResponse>> Approve(Guid id, ApproveAutomationRequest request, CancellationToken ct)
        => Handle(() => _service.ApproveAsync(id, request, ct));

    private async Task<ActionResult<T>> Handle<T>(Func<Task<T>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (AutomationConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}

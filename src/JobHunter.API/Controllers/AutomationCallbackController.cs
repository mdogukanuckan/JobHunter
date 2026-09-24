using JobHunter.API.Security;
using JobHunter.Application.Automation;
using JobHunter.Application.Automation.Dtos;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobHunter.API.Controllers;

/// <summary>
/// n8n'in cagirdigi endpoint'ler (makineden makineye). JWT yerine X-Automation-Key header'i ile korunur.
///
/// Tipik n8n akisi:
///   1. Webhook ile { jobId, payloadUrl, ... } gelir
///   2. GET  payload      → formu doldurmak icin tum veri
///   3. PATCH status      → { "status": "Running" }
///   4. POST events       → her adimda gunluk ("CV yuklendi" ...)
///   5. GET  cv           → CV dosyasini indir, forma yukle
///   6. PATCH status      → Completed / Failed / AwaitingApproval
/// Herhangi bir adimda 409 gelirse is iptal edilmis/bitmis demektir: akis durmali.
/// </summary>
[ApiController]
[AllowAnonymous] // JWT aranmaz; kimlik dogrulamayi asagidaki API anahtari filtresi yapar.
[ServiceFilter(typeof(AutomationApiKeyFilter))]
[Route(AutomationCallbackPaths.Base + "/{jobId:guid}")]
public class AutomationCallbackController : ControllerBase
{
    private readonly IAutomationCallbackService _service;

    public AutomationCallbackController(IAutomationCallbackService service)
    {
        _service = service;
    }

    /// <summary>Formu doldurmak icin veri paketi (profil, politikalar, hazir cevaplar, CV linki).</summary>
    [HttpGet("payload")]
    public Task<ActionResult<AutomationPayload>> GetPayload(Guid jobId, CancellationToken ct)
        => Handle(() => _service.GetPayloadAsync(jobId, ct));

    /// <summary>Bu denemeye sabitlenmis CV dosyasi (binary).</summary>
    [HttpGet("cv")]
    public async Task<IActionResult> GetCv(Guid jobId, CancellationToken ct)
    {
        try
        {
            var file = await _service.GetCvAsync(jobId, ct);
            return File(file.Content, file.ContentType, file.FileName);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>Durum bildirimi. Ornek: { "status": "Failed", "errorMessage": "Captcha cikti" }</summary>
    [HttpPatch("status")]
    public Task<ActionResult<AutomationJobResponse>> UpdateStatus(Guid jobId, UpdateAutomationStatusRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateStatusAsync(jobId, request, ct));

    /// <summary>Gunluge satir ekler. Ornek: { "level": "Info", "step": "upload_cv", "message": "CV yuklendi" }</summary>
    [HttpPost("events")]
    public Task<ActionResult<AutomationEventResponse>> AddEvent(Guid jobId, AddAutomationEventRequest request, CancellationToken ct)
        => Handle(() => _service.AddEventAsync(jobId, request, ct));

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

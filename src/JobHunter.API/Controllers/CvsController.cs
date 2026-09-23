using JobHunter.API.Models;
using JobHunter.Application.Cvs.Dtos;
using JobHunter.Application.Cvs.Exceptions;
using JobHunter.Application.Cvs.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobHunter.API.Controllers;

/// <summary>
/// CV yonetimi. Tum endpoint'ler JWT gerektirir; dosyalara public URL ile erisilemez,
/// sadece sahibi bu endpoint'ler uzerinden indirebilir.
/// </summary>
[ApiController]
[Authorize]
[Route("api/cvs")]
public class CvsController : ControllerBase
{
    // Istek govdesi icin ust sinir (multipart zarfi dahil). Asil dosya siniri CvService'te
    // Storage:MaxCvSizeBytes ile kontrol edilir; bu sadece cok buyuk isteklerin erken kesilmesi icin.
    private const long MaxRequestBytes = 6 * 1024 * 1024;

    private readonly ICvService _service;

    public CvsController(ICvService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CvResponse>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(cancellationToken));

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxRequestBytes)]
    public async Task<ActionResult<CvResponse>> Upload([FromForm] UploadCvForm form, CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = form.File.OpenReadStream();
            var command = new UploadCvCommand(form.Name, form.File.FileName, form.File.Length, stream);

            var result = await _service.UploadAsync(command, cancellationToken);
            return CreatedAtAction(nameof(Download), new { id = result.Id }, result);
        }
        catch (CvValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var file = await _service.DownloadAsync(id, cancellationToken);
            // File(...) akisi yanit yazildiktan sonra kendisi kapatir.
            return File(file.Content, file.ContentType, file.FileName);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<CvResponse>> Rename(Guid id, RenameCvRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.RenameAsync(id, request, cancellationToken));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>Soft delete: CV listeden kalkar; gecmis basvurulardaki baglanti ve dosya korunur.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            await _service.DeleteAsync(id, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

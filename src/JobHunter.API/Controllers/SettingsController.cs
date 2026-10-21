using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Settings.Dtos;
using JobHunter.Application.Settings.Interfaces;
using JobHunter.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobHunter.API.Controllers;

/// <summary>Kullanici ayarlari. Gorunum tercihi hesapta saklanir; login/refresh cevabinda da doner.</summary>
[ApiController]
[Authorize]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _service;
    private readonly IUserSecretService _secrets;

    public SettingsController(ISettingsService service, IUserSecretService secrets)
    {
        _service = service;
        _secrets = secrets;
    }

    [HttpGet("appearance")]
    public async Task<ActionResult<AppearanceSettingsDto>> GetAppearance(CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GetAppearanceAsync(ct));
        }
        catch (KeyNotFoundException)
        {
            return Unauthorized();
        }
    }

    /// <summary>Ornek govde: {"palette":"Ocean","mode":"Light"}</summary>
    [HttpPut("appearance")]
    public async Task<ActionResult<AppearanceSettingsDto>> UpdateAppearance(AppearanceSettingsDto request, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.UpdateAppearanceAsync(request, ct));
        }
        catch (KeyNotFoundException)
        {
            return Unauthorized();
        }
    }

    // ---- Gizli degerler (kullanicinin kendi API anahtari): yazilir, ASLA geri okunmaz ----

    /// <summary>Sirrin durumu: {"configured":true,"last4":"a3f9"}. Deger donmez.</summary>
    [HttpGet("secrets/{kind}")]
    public async Task<ActionResult<SecretStatusDto>> GetSecretStatus(UserSecretKind kind, CancellationToken ct)
        => Ok(await _secrets.GetStatusAsync(kind, ct));

    /// <summary>Ornek govde: {"value":"sk-ant-..."}. Anahtar once dogrulanir, gecersizse hicbir sey kaydedilmez.</summary>
    [HttpPut("secrets/{kind}")]
    public async Task<ActionResult<SecretStatusDto>> SetSecret(UserSecretKind kind, SetSecretRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _secrets.SetAsync(kind, request.Value, ct));
        }
        catch (BusinessValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException)
        {
            // Ana anahtar (Secrets:MasterKey) yapilandirilmamis. Ayrintiyi istemciye degil, sunucu loguna.
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Gizli değer saklama bu sunucuda yapılandırılmamış. Yöneticiye başvurun." });
        }
    }

    [HttpDelete("secrets/{kind}")]
    public async Task<IActionResult> RemoveSecret(UserSecretKind kind, CancellationToken ct)
    {
        await _secrets.RemoveAsync(kind, ct);
        return NoContent();
    }
}

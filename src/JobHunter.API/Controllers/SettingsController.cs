using JobHunter.Application.Settings.Dtos;
using JobHunter.Application.Settings.Interfaces;
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

    public SettingsController(ISettingsService service)
    {
        _service = service;
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

    /// <summary>Ornek govde: {"palette":"Forest","mode":"System"}</summary>
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
}

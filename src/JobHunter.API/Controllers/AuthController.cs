using JobHunter.Application.Auth.Dtos;
using JobHunter.Application.Auth.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobHunter.API.Controllers;

/// <summary>
/// Kimlik dogrulama. Access token response body'de doner (frontend onu sadece bellekte tutar);
/// refresh token httpOnly cookie'dedir: JavaScript okuyamaz, XSS ile calinamaz.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string RefreshCookieName = "jh_refresh";

    private readonly IAuthService _authService;
    private readonly IWebHostEnvironment _environment;

    public AuthController(IAuthService authService, IWebHostEnvironment environment)
    {
        _authService = authService;
        _environment = environment;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.RegisterAsync(request, cancellationToken);
            SetRefreshCookie(result);
            return Ok(result.Response);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.LoginAsync(request, cancellationToken);
            SetRefreshCookie(result);
            return Ok(result.Response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cookie'deki refresh token ile yeni access token alir (token rotasyonu: cookie de yenilenir).
    /// Frontend bunu sayfa acilisinda (oturumu geri yuklemek icin) ve 401 aldiginda cagirir.
    /// </summary>
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(CancellationToken cancellationToken)
    {
        var token = Request.Cookies[RefreshCookieName];
        if (string.IsNullOrEmpty(token))
            return Unauthorized(new { message = "Oturum bulunamadi." });

        try
        {
            var result = await _authService.RefreshAsync(token, cancellationToken);
            SetRefreshCookie(result);
            return Ok(result.Response);
        }
        catch (UnauthorizedAccessException ex)
        {
            // Cookie burada SILINMEZ: iki sekme ayni anda yenilediginde, kaybeden istegin cevabi
            // kazanan istegin az once yazdigi gecerli cookie'yi silerdi. Gecersiz cookie zararsizdir, suresi dolunca kaybolur.
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(Request.Cookies[RefreshCookieName], cancellationToken);
        DeleteRefreshCookie();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _authService.GetCurrentUserAsync(cancellationToken));
        }
        catch (KeyNotFoundException)
        {
            return Unauthorized();
        }
    }

    // ---------- Cookie yardimcilari ----------

    private CookieOptions BuildCookieOptions(DateTimeOffset? expires) => new()
    {
        HttpOnly = true,                              // document.cookie ile okunamaz
        Secure = !_environment.IsDevelopment() || Request.IsHttps, // prod'da sadece HTTPS
        SameSite = SameSiteMode.Strict,               // baska sitelerden gelen isteklere eklenmez (CSRF korumasi)
        Path = "/api/auth",                           // sadece auth endpoint'lerine gonderilir, her API isteginde tasinmaz
        Expires = expires
    };

    private void SetRefreshCookie(AuthResult result)
        => Response.Cookies.Append(RefreshCookieName, result.RefreshToken,
            BuildCookieOptions(new DateTimeOffset(result.RefreshTokenExpiresAt, TimeSpan.Zero)));

    private void DeleteRefreshCookie()
        => Response.Cookies.Delete(RefreshCookieName, BuildCookieOptions(null));
}

using JobHunter.Application.Settings.Dtos;

namespace JobHunter.Application.Auth.Dtos;

/// <summary>
/// Istemciye (response body) donen kimlik bilgisi. Refresh token burada YOK:
/// o, JavaScript'in okuyamadigi httpOnly cookie olarak gonderilir (bkz. AuthController).
/// Appearance: tema tercihi de burada doner; boylece uygulama acilir acilmaz dogru temayla cizilir (ek istek gerekmez).
/// </summary>
public record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    Guid UserId,
    string Email,
    string FullName,
    AppearanceSettingsDto Appearance);

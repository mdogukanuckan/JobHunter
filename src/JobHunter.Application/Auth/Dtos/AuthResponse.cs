namespace JobHunter.Application.Auth.Dtos;

/// <summary>
/// Istemciye (response body) donen kimlik bilgisi. Refresh token burada YOK:
/// o, JavaScript'in okuyamadigi httpOnly cookie olarak gonderilir (bkz. AuthController).
/// </summary>
public record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    Guid UserId,
    string Email,
    string FullName);

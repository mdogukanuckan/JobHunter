namespace JobHunter.Application.Auth.Dtos;

/// <summary>
/// AuthService'in API katmanina dondurdugu tam sonuc: body'ye gidecek yanit + cookie'ye yazilacak refresh token.
/// Application katmani HTTP/cookie bilmez; bu ayrimi controller yapar.
/// </summary>
public record AuthResult(
    AuthResponse Response,
    string RefreshToken,
    DateTime RefreshTokenExpiresAt);

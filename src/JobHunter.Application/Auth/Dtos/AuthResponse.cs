namespace JobHunter.Application.Auth.Dtos;

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    Guid UserId,
    string Email,
    string FullName);
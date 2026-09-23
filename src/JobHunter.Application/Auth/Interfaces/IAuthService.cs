using JobHunter.Application.Auth.Dtos;

namespace JobHunter.Application.Auth.Interfaces;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Refresh token rotasyonu: gecerli token iptal edilir, yerine yenisi + yeni access token verilir.
    /// Gecersiz/suresi dolmus token -> UnauthorizedAccessException.
    /// </summary>
    Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>Refresh token'i iptal eder. Token bulunamazsa sessizce gecer (cikis her zaman basarilidir).</summary>
    Task LogoutAsync(string? refreshToken, CancellationToken cancellationToken = default);

    Task<CurrentUserResponse> GetCurrentUserAsync(CancellationToken cancellationToken = default);
}

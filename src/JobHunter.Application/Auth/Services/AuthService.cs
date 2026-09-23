using System.Security.Cryptography;
using System.Text;
using JobHunter.Application.Auth.Dtos;
using JobHunter.Application.Auth.Interfaces;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Auth.Services;

public class AuthService : IAuthService
{
    /// <summary>Rotasyonla iptal edilen token'in "yaris durumu" sayilacagi sure (coklu sekme).</summary>
    private static readonly TimeSpan RotationGracePeriod = TimeSpan.FromSeconds(30);

    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly ICurrentUserService _currentUser;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        ICurrentUserService currentUser)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _currentUser = currentUser;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email == request.Email, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("Bu e-posta adresi zaten kullaniliyor.");
        }

        var user = new User
        {
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            FullName = request.FullName
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        return await CreateAuthResultAsync(user, cancellationToken);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .SingleOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null || !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("E-posta veya sifre hatali.");
        }

        return await CreateAuthResultAsync(user, cancellationToken);
    }

    public async Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var hash = Hash(refreshToken);

        var stored = await _context.RefreshTokens
            .Include(rt => rt.User)
            .SingleOrDefaultAsync(rt => rt.Token == hash, cancellationToken)
            ?? throw new UnauthorizedAccessException("Oturum gecersiz.");

        if (stored.IsRevoked)
        {
            // Birkac saniye once rotasyonla iptal edildiyse bu buyuk ihtimalle masum bir yaris durumu:
            // iki sekme ayni anda yeniledi. Tarayici yeni cookie'yi zaten aldi; frontend bir kez daha dener.
            if (stored.UpdatedAt is { } revokedAt && DateTime.UtcNow - revokedAt < RotationGracePeriod)
                throw new UnauthorizedAccessException("Oturum baska bir istekte yenilendi.");

            // Uzun sure once iptal edilmis bir token tekrar geldi: token calinmis olabilir
            // (saldirgan ve gercek kullanici ayni token'i kullaniyor). Guvenli taraf: kullanicinin tum oturumlarini kapat.
            await RevokeAllForUserAsync(stored.UserId, cancellationToken);
            throw new UnauthorizedAccessException("Oturum gecersiz.");
        }

        if (!stored.IsActive)
            throw new UnauthorizedAccessException("Oturum suresi doldu.");

        // Rotasyon: eski token bir daha kullanilamaz.
        stored.IsRevoked = true;
        stored.UpdatedAt = DateTime.UtcNow;

        return await CreateAuthResultAsync(stored.User, cancellationToken);
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(refreshToken))
            return;

        var hash = Hash(refreshToken);
        var stored = await _context.RefreshTokens.SingleOrDefaultAsync(rt => rt.Token == hash, cancellationToken);

        if (stored is { IsRevoked: false })
        {
            stored.IsRevoked = true;
            stored.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<CurrentUserResponse> GetCurrentUserAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        return await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new CurrentUserResponse(u.Id, u.Email, u.FullName))
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Kullanici bulunamadi.");
    }

    // ---------- Yardimci metotlar ----------

    private async Task<AuthResult> CreateAuthResultAsync(User user, CancellationToken cancellationToken)
    {
        var (accessToken, accessTokenExpiresAt) = _jwtTokenGenerator.GenerateAccessToken(user);
        var (refreshTokenValue, refreshTokenExpiresAt) = _jwtTokenGenerator.GenerateRefreshToken();

        // DB'de token'in kendisi degil SHA-256 ozeti saklanir: veritabani sizsa bile token'lar kullanilamaz
        // (sifre hash'lemeyle ayni mantik; token zaten 64 byte rastgele oldugu icin hizli hash yeterli, salt gerekmez).
        _context.RefreshTokens.Add(new RefreshToken
        {
            Token = Hash(refreshTokenValue),
            ExpiresAt = refreshTokenExpiresAt,
            UserId = user.Id
        });
        await _context.SaveChangesAsync(cancellationToken);

        var response = new AuthResponse(accessToken, accessTokenExpiresAt, user.Id, user.Email, user.FullName);
        return new AuthResult(response, refreshTokenValue, refreshTokenExpiresAt);
    }

    private async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var active = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var token in active)
        {
            token.IsRevoked = true;
            token.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static string Hash(string token)
        => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}

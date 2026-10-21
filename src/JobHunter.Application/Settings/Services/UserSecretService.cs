using System.Security.Cryptography;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Settings.Dtos;
using JobHunter.Application.Settings.Interfaces;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobHunter.Application.Settings.Services;

/// <summary>
/// Kullanicinin gizli degerleri. Sifreleme ISecretProtector'da; burada: dogrulama, kaydetme, maskeleme.
/// Deger hicbir yerde loglanmaz ve hicbir yanitta geri donmez.
/// </summary>
public class UserSecretService : IUserSecretService, IUserSecretReader
{
    private const int MinLength = 20;
    private const int MaxLength = 500;
    private const int Last4Length = 4;

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ISecretProtector _protector;
    private readonly IAnthropicClient _anthropicClient;
    private readonly ILogger<UserSecretService> _logger;

    public UserSecretService(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        ISecretProtector protector,
        IAnthropicClient anthropicClient,
        ILogger<UserSecretService> logger)
    {
        _context = context;
        _currentUser = currentUser;
        _protector = protector;
        _anthropicClient = anthropicClient;
        _logger = logger;
    }

    public async Task<SecretStatusDto> GetStatusAsync(UserSecretKind kind, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var last4 = await _context.UserSecrets
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Kind == kind)
            .Select(s => s.Last4)
            .FirstOrDefaultAsync(cancellationToken);

        return last4 is null ? new SecretStatusDto(false, null) : new SecretStatusDto(true, last4);
    }

    public async Task<SecretStatusDto> SetAsync(UserSecretKind kind, string value, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var secret = value.Trim();

        if (secret.Length < MinLength || secret.Length > MaxLength || secret.Any(char.IsWhiteSpace))
            throw new BusinessValidationException("Anahtar biçimi geçersiz. Boşluk içermeyen tam anahtarı yapıştırın.");

        await VerifyAsync(kind, secret, cancellationToken);

        // Sifreleme baglami: baska kullanicinin ya da baska turun satirina kopyalanirsa cozulemez.
        var encrypted = _protector.Protect(secret, Context(userId, kind));

        var existing = await _context.UserSecrets.FirstOrDefaultAsync(s => s.UserId == userId && s.Kind == kind, cancellationToken);
        if (existing is null)
        {
            existing = new UserSecret { UserId = userId, Kind = kind };
            _context.UserSecrets.Add(existing);
        }

        existing.EncryptedValue = encrypted;
        existing.Last4 = secret[^Last4Length..];
        existing.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return new SecretStatusDto(true, existing.Last4);
    }

    public async Task RemoveAsync(UserSecretKind kind, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var existing = await _context.UserSecrets.FirstOrDefaultAsync(s => s.UserId == userId && s.Kind == kind, cancellationToken);
        if (existing is null) return;

        _context.UserSecrets.Remove(existing);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<string?> GetPlaintextAsync(Guid userId, UserSecretKind kind, CancellationToken cancellationToken = default)
    {
        var encrypted = await _context.UserSecrets
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Kind == kind)
            .Select(s => s.EncryptedValue)
            .FirstOrDefaultAsync(cancellationToken);
        if (encrypted is null) return null;

        try
        {
            return _protector.Unprotect(encrypted, Context(userId, kind));
        }
        catch (CryptographicException ex)
        {
            // Ana anahtar degismis ya da kayit bozulmus: kullanici anahtari yeniden girmeli. Deger asla loglanmaz.
            _logger.LogWarning(ex, "Kullanici sirri cozulemedi (tur {Kind}); anahtarin yeniden girilmesi gerekiyor.", kind);
            return null;
        }
    }

    private async Task VerifyAsync(UserSecretKind kind, string secret, CancellationToken cancellationToken)
    {
        switch (kind)
        {
            case UserSecretKind.Anthropic:
                try
                {
                    // En kucuk gercek istek: anahtar gecerli mi? (maliyeti ihmal edilebilir)
                    await _anthropicClient.CompleteAsync(secret, "Reply with OK.", "ping", maxTokens: 8, cancellationToken);
                }
                catch (HttpRequestException ex) when (ex.StatusCode is System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden)
                {
                    throw new BusinessValidationException("Anthropic bu anahtarı kabul etmedi. Anahtarı kontrol edip tekrar deneyin.");
                }
                catch (Exception ex) when (ex is HttpRequestException or TimeoutException)
                {
                    _logger.LogWarning(ex, "Anthropic anahtari dogrulanamadi (ag/servis hatasi).");
                    throw new BusinessValidationException("Anahtar şu an doğrulanamadı (Anthropic'e ulaşılamadı ya da kota aşıldı). Biraz sonra tekrar deneyin.");
                }
                break;
        }
    }

    private static string Context(Guid userId, UserSecretKind kind) => $"{userId:N}:{kind}";
}

using JobHunter.Application.Settings.Dtos;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Settings.Interfaces;

/// <summary>Giris yapmis kullanicinin kendi gizli degerleri (JWT). Deger yazilir ama geri okunmaz.</summary>
public interface IUserSecretService
{
    Task<SecretStatusDto> GetStatusAsync(UserSecretKind kind, CancellationToken cancellationToken = default);

    /// <summary>
    /// Degeri dogrular (Anthropic icin gercek bir istekle), sifreleyip kaydeder; varsa ustune yazar.
    /// Gecersizse BusinessValidationException; hicbir sey kaydedilmez.
    /// </summary>
    Task<SecretStatusDto> SetAsync(UserSecretKind kind, string value, CancellationToken cancellationToken = default);

    Task RemoveAsync(UserSecretKind kind, CancellationToken cancellationToken = default);
}

/// <summary>
/// Sistemin (JWT olmadan, orn. n8n callback'i) bir kullanicinin sirrini KULLANMASI icin. Sadece servislere verilir;
/// hicbir controller bu arayuzu disari acmaz.
/// </summary>
public interface IUserSecretReader
{
    /// <returns>Cozulmus deger; kullanici bunu hic girmediyse null.</returns>
    Task<string?> GetPlaintextAsync(Guid userId, UserSecretKind kind, CancellationToken cancellationToken = default);
}

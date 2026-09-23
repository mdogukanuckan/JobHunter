namespace JobHunter.Application.Common.Interfaces;

/// <summary>
/// Istegi yapan (giris yapmis) kullaniciyi temsil eder.
/// Application katmani HTTP/JWT detayini bilmez; bu bilgiyi API katmani saglar.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>Giris yapmis kullanicinin Id'si; kimlik dogrulanmamissa null.</summary>
    Guid? UserId { get; }

    /// <summary>Kullanici Id'sini dondurur; yoksa UnauthorizedAccessException firlatir.</summary>
    Guid GetRequiredUserId();
}

using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Kullanicinin ayarlardan girdigi gizli bir deger (orn. kendi Anthropic API anahtari).
/// Deger HASH'lenmez (kullanilabilmesi icin geri okunabilmeli), SIFRELENIR: AES-GCM, ana anahtar veritabaninda DEGIL
/// yapilandirmada (Secrets:MasterKey). Her kullanici + tur icin tek kayit.
///
/// Gizlilik kurali: EncryptedValue API'den asla donmez; arayuze sadece "var mi" ve Last4 gider.
/// </summary>
public class UserSecret : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public UserSecretKind Kind { get; set; }

    /// <summary>ISecretProtector ciktisi (surum + nonce + etiket + sifreli metin, base64).</summary>
    public string EncryptedValue { get; set; } = string.Empty;

    /// <summary>Degerin son 4 karakteri; kullanici "hangi anahtar" diye taniyabilsin diye maskeli gosterilir.</summary>
    public string Last4 { get; set; } = string.Empty;
}

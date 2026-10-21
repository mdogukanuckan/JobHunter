using System.Security.Cryptography;
using System.Text;
using JobHunter.Application.Common.Interfaces;

namespace JobHunter.Infrastructure.Security;

/// <summary>
/// ISecretProtector: AES-256-GCM (kimlik dogrulamali sifreleme; veri degistirilirse cozme basarisiz olur).
///
/// Format (base64): [surum 1 bayt][nonce 12 bayt][etiket 16 bayt][sifreli metin].
///  - Her sifrelemede RASTGELE nonce: ayni deger iki kez sifrelenince cikti farkli olur.
///  - Baglam (context) AAD olarak girer: sifreli deger baska kullanici/tur satirina kopyalanirsa cozulemez.
///  - Surum baytı ileride algoritma/anahtar degisimine (rotasyon) izin verir.
///
/// Ana anahtar (Secrets:MasterKey, base64, 32 bayt) VERITABANINDA durmaz; user-secrets / ortam degiskeni / secret manager.
/// Tanimli degilse uygulama yine acilir, yalnizca sir kaydetme/okuma anlamli bir hata verir.
/// </summary>
public class AesGcmSecretProtector : ISecretProtector
{
    private const byte Version = 1;
    private const int KeySize = 32;
    private const int NonceSize = 12;
    private const int TagSize = 16;

    private readonly byte[]? _key;

    public AesGcmSecretProtector(string? masterKeyBase64)
    {
        if (string.IsNullOrWhiteSpace(masterKeyBase64)) return;

        try
        {
            var key = Convert.FromBase64String(masterKeyBase64.Trim());
            if (key.Length == KeySize) _key = key;
        }
        catch (FormatException)
        {
            // _key null kalir; kullanilmak istendiginde asagidaki aciklayici hata verilir.
        }
    }

    public string Protect(string plaintext, string context)
    {
        var key = RequireKey();
        var plain = Encoding.UTF8.GetBytes(plaintext);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var cipher = new byte[plain.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(key, TagSize);
        aes.Encrypt(nonce, plain, cipher, tag, Encoding.UTF8.GetBytes(context));

        var output = new byte[1 + NonceSize + TagSize + cipher.Length];
        output[0] = Version;
        nonce.CopyTo(output, 1);
        tag.CopyTo(output, 1 + NonceSize);
        cipher.CopyTo(output, 1 + NonceSize + TagSize);
        return Convert.ToBase64String(output);
    }

    public string Unprotect(string protectedValue, string context)
    {
        var key = RequireKey();

        byte[] data;
        try
        {
            data = Convert.FromBase64String(protectedValue);
        }
        catch (FormatException ex)
        {
            throw new CryptographicException("Sifreli deger biciminde degil.", ex);
        }

        if (data.Length < 1 + NonceSize + TagSize || data[0] != Version)
            throw new CryptographicException("Sifreli deger taninmayan bir surum ya da bozuk.");

        var nonce = data.AsSpan(1, NonceSize);
        var tag = data.AsSpan(1 + NonceSize, TagSize);
        var cipher = data.AsSpan(1 + NonceSize + TagSize);
        var plain = new byte[cipher.Length];

        using var aes = new AesGcm(key, TagSize);
        aes.Decrypt(nonce, cipher, tag, plain, Encoding.UTF8.GetBytes(context));
        return Encoding.UTF8.GetString(plain);
    }

    private byte[] RequireKey()
        => _key ?? throw new InvalidOperationException(
            "Secrets:MasterKey yapilandirilmamis ya da gecersiz (base64, 32 bayt olmali). " +
            "Uretmek icin: [Convert]::ToBase64String((1..32 | % { Get-Random -Maximum 256 }) -as [byte[]])");
}

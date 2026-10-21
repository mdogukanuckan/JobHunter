namespace JobHunter.Application.Common.Interfaces;

/// <summary>
/// Gizli degerleri (API anahtari gibi) veritabaninda saklamak icin sifreler/cozer. Bu bir HASH degildir:
/// deger daha sonra kullanilabilmek icin geri okunabilmelidir.
/// Application katmani algoritmayi ve ana anahtarin nerede durdugunu bilmez; implementasyon Infrastructure'dadir.
/// </summary>
public interface ISecretProtector
{
    /// <param name="context">
    /// Sifreli verinin baglandigi bilgi (orn. "kullaniciId:tur"). Cozerken AYNI baglam verilmezse cozme basarisiz olur;
    /// boylece birinin sifreli degerini baska bir satira kopyalamak ise yaramaz.
    /// </param>
    string Protect(string plaintext, string context);

    /// <exception cref="System.Security.Cryptography.CryptographicException">Veri bozulmus, baglam farkli ya da ana anahtar yanlis.</exception>
    string Unprotect(string protectedValue, string context);
}

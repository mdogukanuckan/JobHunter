namespace JobHunter.Application.Common.Interfaces;

/// <summary>
/// Dosya depolama soyutlamasi. Application katmani dosyanin nerede durdugunu (lokal disk, S3, Azure Blob) bilmez.
/// Implementasyon Infrastructure katmanindadir (su an: LocalFileStorage).
/// </summary>
public interface IFileStorage
{
    /// <summary>Akisi depolamaya yazar ve olusturulan benzersiz StorageKey'i dondurur.</summary>
    Task<string> SaveAsync(Stream content, string fileExtension, CancellationToken cancellationToken = default);

    /// <summary>StorageKey'e ait dosyayi okumak icin akis acar. Dosya yoksa null doner.</summary>
    Task<Stream?> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default);

    /// <summary>Dosyayi kalici olarak siler. Soft delete'te cagrilmaz; ileride temizlik islemleri icin.</summary>
    Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default);
}

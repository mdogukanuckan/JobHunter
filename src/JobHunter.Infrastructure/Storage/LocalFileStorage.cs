using JobHunter.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace JobHunter.Infrastructure.Storage;

/// <summary>
/// Dosyalari lokal diskte, yapilandirilabilir bir kok klasorde saklar.
/// Kok klasor web root'un (wwwroot) disindadir; dosyalara sadece yetkili API endpoint'leri uzerinden erisilir.
/// </summary>
public class LocalFileStorage : IFileStorage
{
    private readonly string _rootPath;

    public LocalFileStorage(IConfiguration configuration)
    {
        var configured = configuration["Storage:RootPath"];

        // Ayar bos ise repo disinda, kullanici profilinde varsayilan bir klasor kullan
        // (Windows: %LOCALAPPDATA%\JobHunter\uploads).
        _rootPath = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "JobHunter", "uploads")
            : Path.GetFullPath(configured);

        Directory.CreateDirectory(_rootPath);
    }

    public async Task<string> SaveAsync(Stream content, string fileExtension, CancellationToken cancellationToken = default)
    {
        // Anahtar tamamen sunucu tarafinda uretilir; kullanicinin dosya adi diske hic ulasmaz.
        var storageKey = $"{Guid.NewGuid():N}{fileExtension.ToLowerInvariant()}";
        var fullPath = GetSafePath(storageKey);

        await using var fileStream = new FileStream(
            fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None,
            bufferSize: 81920, useAsync: true);

        await content.CopyToAsync(fileStream, cancellationToken);

        return storageKey;
    }

    public Task<Stream?> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var fullPath = GetSafePath(storageKey);

        if (!File.Exists(fullPath))
            return Task.FromResult<Stream?>(null);

        Stream stream = new FileStream(
            fullPath, FileMode.Open, FileAccess.Read, FileShare.Read,
            bufferSize: 81920, useAsync: true);

        return Task.FromResult<Stream?>(stream);
    }

    public Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var fullPath = GetSafePath(storageKey);

        if (File.Exists(fullPath))
            File.Delete(fullPath);

        return Task.CompletedTask;
    }

    /// <summary>
    /// Anahtarin sadece bir dosya adi oldugunu ve kok klasorun disina cikmadigini dogrular
    /// ("../" gibi path traversal denemelerine karsi ikinci savunma hatti).
    /// </summary>
    private string GetSafePath(string storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey) || Path.GetFileName(storageKey) != storageKey)
            throw new ArgumentException("Gecersiz storage key.", nameof(storageKey));

        var fullPath = Path.GetFullPath(Path.Combine(_rootPath, storageKey));

        if (!fullPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Gecersiz storage key.", nameof(storageKey));

        return fullPath;
    }
}

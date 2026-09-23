using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Cvs.Dtos;
using JobHunter.Application.Cvs.Exceptions;
using JobHunter.Application.Cvs.Interfaces;
using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Cvs.Services;

public class CvService : ICvService
{
    private const int MaxNameLength = 150;

    /// <summary>Izin verilen uzantilar ve sunucunun belirledigi ContentType (istemcinin gonderdigine guvenilmez).</summary>
    private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    };

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IFileStorage _storage;
    private readonly CvUploadSettings _settings;

    public CvService(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IFileStorage storage,
        CvUploadSettings settings)
    {
        _context = context;
        _currentUser = currentUser;
        _storage = storage;
        _settings = settings;
    }

    public async Task<IReadOnlyList<CvResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        return await _context.Cvs
            .AsNoTracking()
            .Where(cv => cv.UserId == userId && !cv.IsDeleted)
            .OrderByDescending(cv => cv.CreatedAt)
            .Select(cv => new CvResponse(
                cv.Id, cv.Name, cv.OriginalFileName, cv.ContentType, cv.SizeBytes, cv.CreatedAt, cv.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<CvResponse> UploadAsync(UploadCvCommand command, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var extension = Path.GetExtension(command.FileName);
        if (!AllowedTypes.TryGetValue(extension, out var contentType))
            throw new CvValidationException("Sadece PDF (.pdf) ve Word (.docx) dosyalari yuklenebilir.");

        if (command.SizeBytes <= 0)
            throw new CvValidationException("Dosya bos.");

        if (command.SizeBytes > _settings.MaxSizeBytes)
            throw new CvValidationException($"Dosya boyutu en fazla {_settings.MaxSizeBytes / (1024 * 1024)} MB olabilir.");

        // Uzanti kolayca degistirilebilir; dosyanin ilk byte'larina bakarak gercek turunu dogrula.
        await EnsureSignatureMatchesAsync(command.Content, extension, cancellationToken);

        var originalFileName = Path.GetFileName(command.FileName);
        var name = string.IsNullOrWhiteSpace(command.Name)
            ? Path.GetFileNameWithoutExtension(originalFileName)
            : command.Name.Trim();
        if (name.Length > MaxNameLength) name = name[..MaxNameLength];

        // Once dosya, sonra veritabani. DB kaydi basarisiz olursa diskte sahipsiz dosya kalmasin.
        var storageKey = await _storage.SaveAsync(command.Content, extension, cancellationToken);

        var cv = new Cv
        {
            UserId = userId,
            Name = name,
            OriginalFileName = originalFileName,
            StorageKey = storageKey,
            ContentType = contentType,
            SizeBytes = command.SizeBytes
        };

        try
        {
            _context.Cvs.Add(cv);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await _storage.DeleteAsync(storageKey, CancellationToken.None);
            throw;
        }

        return ToResponse(cv);
    }

    public async Task<CvResponse> RenameAsync(Guid id, RenameCvRequest request, CancellationToken cancellationToken = default)
    {
        var cv = await FindOwnedAsync(id, includeDeleted: false, cancellationToken);

        cv.Name = request.Name.Trim();
        cv.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return ToResponse(cv);
    }

    public async Task<CvFileResult> DownloadAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var cv = await FindOwnedAsync(id, includeDeleted: true, cancellationToken);

        var stream = await _storage.OpenReadAsync(cv.StorageKey, cancellationToken)
                     ?? throw new KeyNotFoundException("CV dosyasi bulunamadi.");

        return new CvFileResult(stream, cv.ContentType, cv.OriginalFileName);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var cv = await FindOwnedAsync(id, includeDeleted: false, cancellationToken);

        var now = DateTime.UtcNow;
        cv.IsDeleted = true;
        cv.DeletedAt = now;
        cv.UpdatedAt = now;

        // Silinen CV profilde varsayilan CV olarak seciliyse bagi temizle
        // (profil, silinmis bir CV'yi varsayilan gostermemeli). Ayni SaveChanges icinde, tek transaction.
        var profile = await _context.CandidateProfiles
            .FirstOrDefaultAsync(p => p.UserId == cv.UserId && p.DefaultCvId == cv.Id, cancellationToken);
        if (profile is not null)
        {
            profile.DefaultCvId = null;
            profile.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    // ---------- Yardimci metotlar ----------

    private async Task<Cv> FindOwnedAsync(Guid id, bool includeDeleted, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();

        // Baskasinin CV'si de "bulunamadi" doner; kaydin varligi disari sizdirilmaz.
        return await _context.Cvs.FirstOrDefaultAsync(
                   cv => cv.Id == id && cv.UserId == userId && (includeDeleted || !cv.IsDeleted),
                   cancellationToken)
               ?? throw new KeyNotFoundException("CV bulunamadi.");
    }

    /// <summary>
    /// "Magic number" kontrolu: PDF dosyalari "%PDF-" ile, DOCX dosyalari (ZIP arsivi) "PK\x03\x04" ile baslar.
    /// Kontrolden sonra akis basa sarilir ki dosya eksiksiz kaydedilsin.
    /// </summary>
    private static async Task EnsureSignatureMatchesAsync(Stream content, string extension, CancellationToken cancellationToken)
    {
        if (!content.CanSeek)
            throw new InvalidOperationException("Yukleme akisi seek desteklemiyor.");

        var header = new byte[5];
        var read = await content.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);
        content.Position = 0;

        var isValid = extension.ToLowerInvariant() switch
        {
            ".pdf" => read >= 5 && header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46 && header[4] == 0x2D,
            ".docx" => read >= 4 && header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04,
            _ => false
        };

        if (!isValid)
            throw new CvValidationException("Dosya icerigi uzantisiyla uyusmuyor.");
    }

    private static CvResponse ToResponse(Cv cv) => new(
        cv.Id, cv.Name, cv.OriginalFileName, cv.ContentType, cv.SizeBytes, cv.CreatedAt, cv.UpdatedAt);
}

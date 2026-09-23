using JobHunter.Domain.Common;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Kullanicinin yukledigi bir CV dosyasinin metadata'si.
/// Dosyanin kendisi IFileStorage uzerinden saklanir; burada sadece ona giden anahtar (StorageKey) tutulur.
/// Silme islemi soft delete'tir: gecmis basvurular hangi CV ile yapildigini gostermeye devam eder.
/// </summary>
public class Cv : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Kullanicinin verdigi gorunen ad, orn. "Backend Developer CV".</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Yuklenen dosyanin orijinal adi (sadece indirme sirasinda gosterilir, diskte kullanilmaz).</summary>
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>Depolamadaki benzersiz anahtar (GUID tabanli). Kullanici girdisinden turetilmez.</summary>
    public string StorageKey { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
}

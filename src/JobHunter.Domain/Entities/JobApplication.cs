using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Kanban panosundaki tek bir is basvurusu karti.
/// Her basvuru bir kullaniciya aittir; kullanicilar sadece kendi basvurularini gorur.
/// </summary>
public class JobApplication : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string CompanyName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public string? JobUrl { get; set; }
    public string? Location { get; set; }
    public string? Source { get; set; }          // LinkedIn, Kariyer.net, sirket sitesi vb.
    public string? JobDescription { get; set; }  // Ilan metni (ileride AI/otomasyon icin kullanilacak)
    public string? Notes { get; set; }

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Wishlist;

    /// <summary>Kartin kendi sutunu icindeki sirasi (0 = en ustte).</summary>
    public int Position { get; set; }

    /// <summary>Basvurunun gonderildigi tarih (Applied durumuna ilk gecis).</summary>
    public DateTime? AppliedAt { get; set; }

    /// <summary>Bu basvuruda kullanilan (veya kullanilacak) CV. Opsiyonel.</summary>
    public Guid? CvId { get; set; }
    public Cv? Cv { get; set; }

    public ICollection<ApplicationStatusHistory> StatusHistory { get; set; } = new List<ApplicationStatusHistory>();
    public ICollection<Interview> Interviews { get; set; } = new List<Interview>();
    public ICollection<TodoItem> Todos { get; set; } = new List<TodoItem>();

    /// <summary>Otomatik basvuru denemeleri (Faz 8). Her deneme ayri satir.</summary>
    public ICollection<AutomationJob> AutomationJobs { get; set; } = new List<AutomationJob>();
}

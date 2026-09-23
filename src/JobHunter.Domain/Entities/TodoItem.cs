using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Kullanicinin yapilacaklar listesindeki bir gorev.
/// Genel olabilir ("LinkedIn profilini guncelle") veya bir basvuruya ve/veya mulakata baglanabilir.
/// </summary>
public class TodoItem : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? JobApplicationId { get; set; }
    public JobApplication? JobApplication { get; set; }

    public Guid? InterviewId { get; set; }
    public Interview? Interview { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Son tarih (UTC). Opsiyonel.</summary>
    public DateTime? DueAt { get; set; }

    public TodoPriority Priority { get; set; } = TodoPriority.Medium;

    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
}

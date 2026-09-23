using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Bir basvurunun durum degisikliklerinin kaydi (timeline).
/// Her sutun degisiminde yeni bir satir eklenir; kayitlar guncellenmez.
/// </summary>
public class ApplicationStatusHistory : BaseEntity
{
    public Guid JobApplicationId { get; set; }
    public JobApplication JobApplication { get; set; } = null!;

    /// <summary>Onceki durum. Basvuru ilk olusturuldugunda null'dir.</summary>
    public ApplicationStatus? FromStatus { get; set; }
    public ApplicationStatus ToStatus { get; set; }

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}

using JobHunter.Domain.Common;

namespace JobHunter.Domain.Entities;

/// <summary>Profildeki tek bir is deneyimi.</summary>
public class WorkExperience : BaseEntity
{
    public Guid CandidateProfileId { get; set; }
    public CandidateProfile CandidateProfile { get; set; } = null!;

    public string CompanyName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Location { get; set; }

    // Formlar genelde gun degil ay/yil ister; DateOnly saat/zaman dilimi karmasasini onler.
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    /// <summary>Halen bu iste calisiyorsa true; bu durumda EndDate bos olmalidir.</summary>
    public bool IsCurrent { get; set; }

    public string? Description { get; set; }
}

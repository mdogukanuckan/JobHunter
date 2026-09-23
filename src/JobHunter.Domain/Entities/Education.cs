using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>Profildeki tek bir egitim kaydi.</summary>
public class Education : BaseEntity
{
    public Guid CandidateProfileId { get; set; }
    public CandidateProfile CandidateProfile { get; set; } = null!;

    public string School { get; set; } = string.Empty;
    public string? FieldOfStudy { get; set; }
    public EducationDegree Degree { get; set; }

    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    /// <summary>Not ortalamasi serbest metin: "3.45/4.00", "85/100" gibi farkli olcekler olabilir.</summary>
    public string? Gpa { get; set; }

    public string? Description { get; set; }
}

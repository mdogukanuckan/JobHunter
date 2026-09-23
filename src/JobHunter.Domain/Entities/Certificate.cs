using JobHunter.Domain.Common;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Sertifika (orn. "AZ-204", "Scrum Master"). Formlar sertifikalari veren kurum ve tarihle ayri bir bolum olarak sordugu icin
/// egitimden ayri tutulur. Uzun sureli programlar (bootcamp vb.) Education'da Degree = Certificate olarak kalabilir.
/// </summary>
public class Certificate : BaseEntity
{
    public Guid CandidateProfileId { get; set; }
    public CandidateProfile CandidateProfile { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? Issuer { get; set; }
    public DateOnly? IssueDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }   // null = suresiz
    public string? CredentialId { get; set; }
    public string? CredentialUrl { get; set; }
}

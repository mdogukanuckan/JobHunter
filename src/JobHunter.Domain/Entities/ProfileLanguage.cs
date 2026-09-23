using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>Adayin bildigi bir dil ve seviyesi. Ayni profilde ayni dil iki kez olamaz.</summary>
public class ProfileLanguage : BaseEntity
{
    public Guid CandidateProfileId { get; set; }
    public CandidateProfile CandidateProfile { get; set; } = null!;

    public string Name { get; set; } = string.Empty;   // "English", "Turkce", "Spanish"...
    public LanguageLevel Level { get; set; }
}

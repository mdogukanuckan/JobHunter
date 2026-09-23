using JobHunter.Domain.Common;

namespace JobHunter.Domain.Entities;

/// <summary>Referans kisi. Otomasyon politikasi tum liste icin ProfileFields.References anahtariyla belirlenir.</summary>
public class ProfileReference : BaseEntity
{
    public Guid CandidateProfileId { get; set; }
    public CandidateProfile CandidateProfile { get; set; } = null!;

    public string FullName { get; set; } = string.Empty;
    public string? Company { get; set; }
    public string? Title { get; set; }
    public string? Relationship { get; set; }   // "Eski yoneticim", "Ekip arkadasi"...
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
}

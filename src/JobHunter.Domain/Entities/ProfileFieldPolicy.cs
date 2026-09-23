using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Kullanicinin bir profil alani icin sectigi otomasyon politikasi (varsayilandan farkliysa).
/// FieldKey, JobHunter.Domain.Profiles.ProfileFields sabitlerinden biridir.
/// </summary>
public class ProfileFieldPolicy : BaseEntity
{
    public Guid CandidateProfileId { get; set; }
    public CandidateProfile CandidateProfile { get; set; } = null!;

    public string FieldKey { get; set; } = string.Empty;
    public AutofillPolicy Policy { get; set; }
}

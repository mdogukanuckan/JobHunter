namespace JobHunter.Domain.Enums;

/// <summary>Askerlik durumu (Turkiye'deki formlarda erkek adaylara neredeyse her zaman sorulur).</summary>
public enum MilitaryServiceStatus
{
    Completed,     // Yapildi
    Exempt,        // Muaf
    Postponed,     // Tecilli (bkz. CandidateProfile.MilitaryPostponedUntil)
    NotCompleted,  // Yapilmadi
    NotApplicable  // Muhatap degil (orn. kadin adaylar)
}

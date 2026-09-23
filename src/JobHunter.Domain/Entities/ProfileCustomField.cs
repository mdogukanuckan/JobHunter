using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// "Ek bilgiler": sabit alanlarda karsiligi olmayan, nadir sorulan bilgiler icin esnek etiket-deger listesi
/// (orn. "Kan grubu: A Rh+", "Cocuk sayisi: 0"). Her kaydin kendi otomasyon politikasi vardir.
/// Serbest metinli sorular (neden biz? vb.) icin hazir cevap bankasi (ScreeningAnswer) kullanilir.
/// </summary>
public class ProfileCustomField : BaseEntity
{
    public Guid CandidateProfileId { get; set; }
    public CandidateProfile CandidateProfile { get; set; } = null!;

    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public AutofillPolicy Policy { get; set; } = AutofillPolicy.Auto;
}

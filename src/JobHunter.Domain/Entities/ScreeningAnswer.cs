using JobHunter.Domain.Common;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Hazir cevap bankasi: basvuru formlarinda sik cikan sorulara onceden yazilmis cevaplar
/// (orn. "Neden bu sirkette calismak istiyorsunuz?", "Vize sponsorlugu gerekiyor mu?").
/// Otomasyon, formdaki soruyu buradaki sorularla eslestirip cevabi kullanacak.
/// </summary>
public class ScreeningAnswer : BaseEntity
{
    public Guid CandidateProfileId { get; set; }
    public CandidateProfile CandidateProfile { get; set; } = null!;

    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;

    /// <summary>Eslestirmeye yardimci anahtar kelimeler, orn. ["motivation", "why us"]. text[] olarak saklanir.</summary>
    public List<string> Tags { get; set; } = new();
}

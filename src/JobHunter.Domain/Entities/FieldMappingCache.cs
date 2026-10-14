using JobHunter.Domain.Common;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Faz 10b: Claude API'nin bir form alani icin verdigi eslestirme kararinin onbellegi.
/// Ayni normallestirilmis etiket (+ alan tipi) bir daha karsimiza ciktiginda Claude'a tekrar
/// sorulmaz; NormalizedLabel gorulmemisse istek atilir, sonuc buraya yazilir (eslesme
/// bulunamadiysa bile - TargetKind/TargetKey null olarak - boylece "eslesmiyor" karari da
/// onbelleklenir ve tekrar tekrar sorulmaz).
///
/// CandidateProfileId'ye bagli tutulur: ayni etiket farkli kullanicida farkli hazir cevap/ek
/// bilgiye karsilik gelebilir (screening/customField hedefleri kullaniciya ozeldir).
/// </summary>
public class FieldMappingCache : BaseEntity
{
    public Guid CandidateProfileId { get; set; }
    public CandidateProfile CandidateProfile { get; set; } = null!;

    /// <summary>Form alaninin etiketi+ipuclarinin normallestirilmis hali (worker'daki norm() ile ayni kural).</summary>
    public string NormalizedLabel { get; set; } = string.Empty;

    /// <summary>Form alani tipi (text/select/textarea/...); ayni etiket farkli tipte farkli anlam tasiyabilir.</summary>
    public string FieldType { get; set; } = string.Empty;

    /// <summary>Hedefin turu: "Candidate" | "Screening" | "CustomField". Eslesme yoksa null.</summary>
    public string? TargetKind { get; set; }

    /// <summary>
    /// Hedefin anahtari: Candidate icin sabit alan adi (orn. "firstName"),
    /// Screening/CustomField icin ilgili kaydin Id'si (Guid metni). Eslesme yoksa null.
    /// </summary>
    public string? TargetKey { get; set; }
}

namespace JobHunter.Application.Automation.Dtos;

/// <summary>
/// Faz 10b: worker'in kural tabanli motorun (mapping.ts) cozemedigi form alanlarini TOPLU olarak
/// sordugu istek. Sadece alan MEDATASI gider (etiket/ipucu/tip/secenekler) — profil DEGERLERI asla
/// bu istekte yer almaz; degerler worker'da zaten var olan AutomationPayload'dan cozulur.
/// </summary>
public record SuggestFieldMappingRequest(IReadOnlyList<FieldMappingQuery> Fields);

public record FieldMappingQuery(
    string Label,
    string Hints,
    string Type,
    IReadOnlyList<string>? Options);

public record SuggestFieldMappingResponse(IReadOnlyList<FieldMappingSuggestion> Results);

/// <summary>
/// Bir alan icin karar. TargetKind/TargetKey null ise "karsiligi yok" (Claude'a soruldu, eslesme
/// bulunamadi ya da Claude API yapilandirilmamis/hata verdi) — worker mevcut "skip" davranisina duser.
///   Candidate    → TargetKey, AutomationPayloadCandidate alan adi (orn. "phoneNumber").
///   Screening    → TargetKey, ilgili hazir cevabin SORU metni (payload.screeningAnswers[].Question ile birebir).
///   CustomField  → TargetKey, ilgili ek bilginin ETIKETI (payload.customFields[].Label ile birebir).
/// </summary>
public record FieldMappingSuggestion(
    string Label,
    string Type,
    string? TargetKind,
    string? TargetKey,
    bool FromCache);

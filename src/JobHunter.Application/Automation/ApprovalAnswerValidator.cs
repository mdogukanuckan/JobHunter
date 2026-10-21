using System.Text.Json;

namespace JobHunter.Application.Automation;

/// <summary>Dogrulama sonucu: hata varsa Error dolu; yoksa Answers, formun bekledigi bicime cevrilmis cevaplardir.</summary>
public record ApprovalAnswerValidation(string? Error, JsonElement? Answers);

/// <summary>
/// Onay cevaplarini inceleme raporuna karsi dogrular ve gerekirse alanin bekledigi bicime cevirir:
///  - secimli alanlarda (dropdown/radio) cevap, worker'in raporladigi seceneklerden biri OLMALI;
///  - tarih alanlarinda ("date") kabul edilen yazimlar (24.06.1998 gibi) ISO bicimine cevrilir, gecersizse reddedilir.
/// Boylece yanlis/yazim hatali bir deger (Telegram, onay ekrani ya da dogrudan API fark etmez) onaylanip gonderim
/// asamasinda sessizce kaybolmaz; baska bir seceneğe de esleşmez. Seceneksiz serbest metin alanlarina dokunmaz.
/// Eski raporlar tur/secenek icermez: onlar icin dogrulama atlanir.
/// </summary>
public static class ApprovalAnswerValidator
{
    public static ApprovalAnswerValidation Validate(string? reviewReportJson, JsonElement? answers)
    {
        if (string.IsNullOrWhiteSpace(reviewReportJson) || answers is not { ValueKind: JsonValueKind.Object } given)
            return new ApprovalAnswerValidation(null, answers);

        var fields = ReadFields(reviewReportJson);
        if (fields.Count == 0) return new ApprovalAnswerValidation(null, answers);

        var normalized = new Dictionary<string, JsonElement>();
        foreach (var answer in given.EnumerateObject())
        {
            normalized[answer.Name] = answer.Value;

            if (!fields.TryGetValue(answer.Name, out var field)) continue;

            var value = answer.Value.ValueKind == JsonValueKind.String ? answer.Value.GetString()?.Trim() : null;
            if (string.IsNullOrEmpty(value)) continue;   // bos cevap "girilmedi" demek; zorunluluk baska yerde denetlenir

            if (field.Options.Count > 0 && !field.Options.Contains(value, StringComparer.Ordinal))
                return Fail($"\"{field.Label}\" için geçersiz seçim. İzin verilenler: {string.Join(", ", field.Options)}.");

            if (field.Type == ApprovalAnswerFormats.DateFieldType)
            {
                if (!ApprovalAnswerFormats.TryNormalizeDate(value, out var iso))
                    return Fail($"\"{field.Label}\" için geçersiz tarih. Şu biçimde yazın: {ApprovalAnswerFormats.DateHint}.");
                normalized[answer.Name] = JsonSerializer.SerializeToElement(iso);
            }
        }

        return new ApprovalAnswerValidation(null, JsonSerializer.SerializeToElement(normalized));
    }

    private static ApprovalAnswerValidation Fail(string error) => new(error, null);

    private record FieldRule(string Label, string? Type, List<string> Options);

    private static Dictionary<string, FieldRule> ReadFields(string reviewReportJson)
    {
        var result = new Dictionary<string, FieldRule>();

        using var doc = JsonDocument.Parse(reviewReportJson);
        if (!doc.RootElement.TryGetProperty("skipped", out var skipped) || skipped.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var f in skipped.EnumerateArray())
        {
            if (!f.TryGetProperty("name", out var n) || n.GetString() is not { Length: > 0 } name) continue;

            var options = f.TryGetProperty("options", out var o) && o.ValueKind == JsonValueKind.Array
                ? o.EnumerateArray()
                    .Where(x => x.ValueKind == JsonValueKind.String)
                    .Select(x => x.GetString()!.Trim())
                    .Where(x => x.Length > 0)
                    .ToList()
                : new List<string>();
            var type = f.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String ? t.GetString() : null;
            if (options.Count == 0 && type != ApprovalAnswerFormats.DateFieldType) continue;

            var label = f.TryGetProperty("label", out var l) ? l.GetString() ?? name : name;
            result.TryAdd(name, new FieldRule(label, type, options));
        }

        return result;
    }
}

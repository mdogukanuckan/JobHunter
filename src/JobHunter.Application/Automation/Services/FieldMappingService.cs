using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using JobHunter.Application.Automation.Dtos;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Settings.Interfaces;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobHunter.Application.Automation.Services;

/// <summary>
/// Faz 10b: kural tabanli motorun (worker/mapping.ts) cozemedigi form alanlari icin Claude API'ye
/// TOPLU (form basina tek istek) danisir.
///
/// Gizlilik: Claude'a SADECE alan metadatasi (etiket/ipucu/tip/secenekler) ve hedef "menu"su
/// (candidate.* sabit anahtarlarin aciklamalari + kullanicinin kendi hazir cevap SORULARI / ek bilgi
/// ETIKETLERI) gider — profildeki hicbir DEGER (telefon numarasi, hazir cevabin kendisi, ek bilginin
/// degeri vb.) Claude'a gonderilmez. Claude sadece "hangi alan hangi menu ogesine karsilik geliyor"
/// diye siniflandirir; gercek degeri worker zaten elindeki AutomationPayload'dan okur.
///
/// Onbellek (FieldMappingCache): normallestirilmis etiket+tip basina TEK karar saklanir (eslesme
/// bulunamadiysa bile) — ayni etiket bir daha sorulmaz. Sadece Claude'dan GERCEKTEN cevap alinan
/// alanlar onbeklenir; yapilandirma eksikligi/HTTP hatasi gibi geçici durumlar onbeklenmez (bir
/// sonraki denemede tekrar denenir).
/// </summary>
public class FieldMappingService : IFieldMappingService
{
    private readonly IApplicationDbContext _context;
    private readonly IAnthropicClient _anthropicClient;
    private readonly IUserSecretReader _secrets;
    private readonly AutomationOptions _options;
    private readonly ILogger<FieldMappingService> _logger;

    public FieldMappingService(
        IApplicationDbContext context, IAnthropicClient anthropicClient, IUserSecretReader secrets,
        AutomationOptions options, ILogger<FieldMappingService> logger)
    {
        _context = context;
        _anthropicClient = anthropicClient;
        _secrets = secrets;
        _options = options;
        _logger = logger;
    }

    /// <summary>
    /// Once kullanicinin ayarlardan girdigi (sifreli) anahtar; yoksa sistem yapilandirmasindaki yedek anahtar
    /// (Automation:AnthropicApiKey, genelde bos). Hicbiri yoksa InvalidOperationException: cagiran "AI kapali" der.
    /// </summary>
    private async Task<string> ResolveApiKeyAsync(Guid userId, CancellationToken cancellationToken)
    {
        var key = await _secrets.GetPlaintextAsync(userId, UserSecretKind.Anthropic, cancellationToken);
        if (!string.IsNullOrWhiteSpace(key)) return key;
        if (!string.IsNullOrWhiteSpace(_options.AnthropicApiKey)) return _options.AnthropicApiKey;
        throw new InvalidOperationException("Kullanici icin Anthropic API anahtari tanimli degil; AI destekli alan eslestirmesi kapali.");
    }

    /// <summary>v1 kapsami: sadece AutomationPayloadCandidate'daki sade/skaler alanlar. Karmasik deger
    /// formatlamasi gereken politikali alanlar (cinsiyet, medeni durum, askerlik, adres, maas, referanslar...)
    /// kural tabanli motor tarafindan zaten iyi kapsaniyor; v1'de bilinçli olarak disaridadir.</summary>
    private static readonly (string Key, string Description)[] CandidateFields =
    [
        ("fullName", "Ad soyad (tam)"),
        ("firstName", "Ad"),
        ("lastName", "Soyad"),
        ("email", "E-posta adresi"),
        ("phoneNumber", "Telefon numarasi"),
        ("headline", "Guncel unvan / baslik (orn. Backend Developer)"),
        ("summary", "Kisa ozgecmis / hakkimda metni"),
        ("city", "Yasadigi sehir"),
        ("country", "Yasadigi ulke"),
        ("linkedInUrl", "LinkedIn profil linki"),
        ("gitHubUrl", "GitHub profil linki"),
        ("portfolioUrl", "Kisisel portfolyo / website linki"),
        ("yearsOfExperience", "Toplam is deneyimi (yil, sayi)"),
        ("noticePeriodDays", "Ihbar suresi (gun, sayi)"),
        ("preferredWorkMode", "Tercih edilen calisma sekli (Remote/Hybrid/Office)"),
        ("openToRelocation", "Sehir/ulke degistirmeye acik mi (evet/hayir)"),
        ("requiresVisaSponsorship", "Calisma izni sponsorlugu gerekiyor mu (evet/hayir)"),
        ("workAuthorization", "Calisma izni durumu aciklamasi (serbest metin)"),
        ("skills", "Yetenekler / teknoloji listesi"),
    ];

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<SuggestFieldMappingResponse> SuggestAsync(Guid jobId, SuggestFieldMappingRequest request, CancellationToken cancellationToken = default)
    {
        var job = await _context.AutomationJobs
            .AsNoTracking()
            .Include(j => j.JobApplication)
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken)
            ?? throw new KeyNotFoundException("Otomasyon isi bulunamadi.");

        var results = new FieldMappingSuggestion?[request.Fields.Count];
        var normalizedKeys = new string[request.Fields.Count];

        var profile = await _context.CandidateProfiles
            .AsNoTracking()
            .Include(p => p.ScreeningAnswers)
            .Include(p => p.CustomFields)
            .FirstOrDefaultAsync(p => p.UserId == job.JobApplication.UserId, cancellationToken);

        if (profile is null)
        {
            // Profil yoksa eslestirilecek bir sey de yok; hepsini "karsiligi yok" don (onbeklemeden).
            for (var i = 0; i < request.Fields.Count; i++)
            {
                var f = request.Fields[i];
                results[i] = new FieldMappingSuggestion(f.Label, f.Type, null, null, false);
            }
            return new SuggestFieldMappingResponse(results!);
        }

        // 1) Onbellekten cevaplanabilenler.
        var toAsk = new List<int>();
        for (var i = 0; i < request.Fields.Count; i++)
        {
            var f = request.Fields[i];
            var key = Normalize($"{f.Label} {f.Hints}");
            normalizedKeys[i] = key;

            var cached = await _context.FieldMappingCaches
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CandidateProfileId == profile.Id && c.NormalizedLabel == key && c.FieldType == f.Type, cancellationToken);

            if (cached is not null)
                results[i] = new FieldMappingSuggestion(f.Label, f.Type, cached.TargetKind, cached.TargetKey, true);
            else
                toAsk.Add(i);
        }

        if (toAsk.Count == 0)
            return new SuggestFieldMappingResponse(results!);

        // 2) Onbellekte olmayanlari TEK toplu istekte Claude'a sor.
        Dictionary<int, (string? Kind, string? Key)>? decisions = null;
        try
        {
            decisions = await AskClaudeAsync(toAsk, request.Fields, profile, cancellationToken);
        }
        catch (Exception ex) when (ex is InvalidOperationException or HttpRequestException or JsonException or TimeoutException)
        {
            // AI kapali/yapilandirilmamis ya da gecici hata: bu alanlar bu seferlik "karsiligi yok" olur,
            // AMA onbeklenmez (bir sonraki denemede tekrar sorulur) — sadece gercek Claude cevaplari onbeklenir.
            _logger.LogWarning(ex, "[Automation] Faz 10b: Claude API alan eslestirmesi basarisiz, is {JobId}.", jobId);
        }

        var newCacheEntries = new List<FieldMappingCache>();
        foreach (var i in toAsk)
        {
            var f = request.Fields[i];
            var (kind, targetKey) = decisions?.GetValueOrDefault(i) ?? (null, null);
            results[i] = new FieldMappingSuggestion(f.Label, f.Type, kind, targetKey, false);

            if (decisions is not null) // sadece gercek bir Claude cevabi varsa onbekle (basarisizlik degil).
            {
                newCacheEntries.Add(new FieldMappingCache
                {
                    CandidateProfileId = profile.Id,
                    NormalizedLabel = normalizedKeys[i],
                    FieldType = f.Type,
                    TargetKind = kind,
                    TargetKey = targetKey,
                });
            }
        }

        if (newCacheEntries.Count > 0)
        {
            _context.FieldMappingCaches.AddRange(newCacheEntries);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return new SuggestFieldMappingResponse(results!);
    }

    private async Task<Dictionary<int, (string? Kind, string? Key)>> AskClaudeAsync(
        List<int> indices, IReadOnlyList<FieldMappingQuery> fields, CandidateProfile profile, CancellationToken cancellationToken)
    {
        var menu = new StringBuilder();
        menu.AppendLine("Aday bilgileri (candidate.*):");
        foreach (var (key, desc) in CandidateFields)
            menu.AppendLine($"- candidate:{key} — {desc}");

        if (profile.ScreeningAnswers.Count > 0)
        {
            menu.AppendLine("\nHazir cevaplar (adayin kendi yazdigi soru-cevaplar, sadece SORU metni verildi):");
            foreach (var qa in profile.ScreeningAnswers)
                menu.AppendLine($"- screening:{qa.Question}");
        }

        if (profile.CustomFields.Count > 0)
        {
            menu.AppendLine("\nEk bilgiler (adayin girdigi serbest etiketler, sadece ETIKET verildi):");
            foreach (var cf in profile.CustomFields)
                menu.AppendLine($"- customField:{cf.Label}");
        }

        var fieldsJson = JsonSerializer.Serialize(
            indices.Select(i => new { index = i, label = fields[i].Label, hints = fields[i].Hints, type = fields[i].Type, options = fields[i].Options }),
            JsonOptions);

        const string system = """
            Sen bir is basvuru formu doldurma asistanisin. Sana bir form alani listesi ve bu alanlarin
            eslesebilecegi "hedef" menusu verilecek. Her alan icin, EGER menudeki bir hedefle ACIKCA
            eslesiyorsa o hedefin anahtarini ("candidate:xxx", "screening:<tam soru metni>" veya
            "customField:<tam etiket metni>") don. Emin degilsen veya hicbir hedef uymuyorsa "none" don.
            SADECE gecerli JSON dizisi don, baska hicbir metin yazma: [{"index":0,"target":"candidate:email"}, ...]
            Her giris alani icin tam olarak bir sonuc olmali (index ile eslesen).
            screening/customField hedeflerinde anahtari TAM OLARAK menude verilen metinle birebir ayni yaz.
            """;

        var user = $"HEDEF MENUSU:\n{menu}\n\nFORM ALANLARI (JSON):\n{fieldsJson}\n\nSadece JSON dizisini don.";

        var apiKey = await ResolveApiKeyAsync(profile.UserId, cancellationToken);
        var raw = await _anthropicClient.CompleteAsync(apiKey, system, user, null, cancellationToken);
        var json = ExtractJsonArray(raw);

        var parsed = JsonSerializer.Deserialize<List<ClaudeDecision>>(json, JsonOptions)
            ?? throw new JsonException("Claude yaniti bos.");

        var screeningQuestions = profile.ScreeningAnswers.Select(q => q.Question).ToHashSet(StringComparer.Ordinal);
        var customFieldLabels = profile.CustomFields.Select(c => c.Label).ToHashSet(StringComparer.Ordinal);
        var candidateKeys = CandidateFields.Select(c => c.Key).ToHashSet(StringComparer.Ordinal);

        var result = new Dictionary<int, (string?, string?)>();
        foreach (var d in parsed)
        {
            if (d.Target is null || d.Target.Equals("none", StringComparison.OrdinalIgnoreCase))
            {
                result[d.Index] = (null, null);
                continue;
            }

            var sep = d.Target.IndexOf(':');
            if (sep < 0) { result[d.Index] = (null, null); continue; }

            var kindRaw = d.Target[..sep];
            var key = d.Target[(sep + 1)..];

            (string?, string?) decision = kindRaw switch
            {
                "candidate" when candidateKeys.Contains(key) => ("Candidate", key),
                "screening" when screeningQuestions.Contains(key) => ("Screening", key),
                "customField" when customFieldLabels.Contains(key) => ("CustomField", key),
                _ => (null, null), // Claude uydurmus/hatali anahtar verdi: guvenli tarafta kal.
            };
            result[d.Index] = decision;
        }

        // Claude'un cevaplamadigi index'ler icin "karsiligi yok" varsay (yine de onbeklenir; bkz. sinif ustu not).
        foreach (var i in indices)
            result.TryAdd(i, (null, null));

        return result;
    }

    /// <summary>Model bazen yaniti ```json ... ``` bloguna sarabilir; sadece [...] kismini ayiklar.</summary>
    private static string ExtractJsonArray(string raw)
    {
        var start = raw.IndexOf('[');
        var end = raw.LastIndexOf(']');
        if (start < 0 || end < start) throw new JsonException("Yanitta JSON dizisi bulunamadi.");
        return raw[start..(end + 1)];
    }

    private record ClaudeDecision([property: JsonPropertyName("index")] int Index, [property: JsonPropertyName("target")] string? Target);

    private static readonly Dictionary<string, string> TrMap = new()
    {
        ["ç"] = "c", ["ğ"] = "g", ["ı"] = "i", ["ö"] = "o", ["ş"] = "s", ["ü"] = "u",
    };

    /// <summary>Worker'daki text.ts norm() ile ayni ruhta: Turkce karakter/buyuk-kucuk/noktalama farklarini yok sayar.</summary>
    private static string Normalize(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return string.Empty;
        var lower = s.ToLower(new CultureInfo("tr-TR"));
        var sb = new StringBuilder(lower.Length);
        foreach (var ch in lower)
        {
            var mapped = TrMap.TryGetValue(ch.ToString(), out var m) ? m[0] : ch;
            sb.Append(char.IsLetterOrDigit(mapped) ? mapped : ' ');
        }
        return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }
}

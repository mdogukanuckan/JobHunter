using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace JobHunter.Application.Automation.Telegram;

public enum TelegramStep { Question, Consent, Confirm, AppOnly }

public record TelegramQuestion(string Name, string Label, bool Required);

/// <summary>Bir onay konusmasinin kalici durumu (AutomationJob.TelegramConversationJson).</summary>
public class TelegramConversationState
{
    public List<TelegramQuestion> Questions { get; set; } = new();
    public int Index { get; set; }
    public Dictionary<string, string> Answers { get; set; } = new();

    /// <summary>KVKK / aydinlatma kutusunun etiketi; null ise onay gerekmiyor.</summary>
    public string? ConsentLabel { get; set; }
    public bool ConsentAccepted { get; set; }

    public TelegramStep Step { get; set; }
}

public enum TelegramAction { None, Approve, Cancel }

/// <summary>Bir adimin sonucu: kullaniciya gidecek mesajlar ve (varsa) backend'in yapacagi is.</summary>
public record TelegramTurn(IReadOnlyList<TelegramReply> Replies, TelegramAction Action = TelegramAction.None);

public record TelegramReply(string Text, IReadOnlyList<TelegramButton>? Buttons = null);

/// <summary>
/// Telegram uzerinden eksik alan doldurma konusmasinin durum makinesi. Saf mantik: veritabani, HTTP ve saat yok;
/// girdi (durum + mesaj) → cikti (yeni durum + cevaplar + eylem). Servis katmani bunu kalicilastirir ve uygular.
///
/// Akis: sorular (tek tek) → KVKK onayi (gerekiyorsa) → ozet + Onayla/Iptal/Bastan.
/// Onay ekraninin (frontend AutomationPanel) kurallariyla ayni: KVKK ayri onay olarak ele alinir,
/// ayni alan adi tek kez sorulur. T.C. kimlik no gibi alanlar Telegram'dan ISTENMEZ (kisisel veri Telegram
/// sunucularindan gecmesin); bu durumda kullanici uygulamaya yonlendirilir.
/// </summary>
public static class TelegramConversation
{
    public const string ActionConfirm = "c";
    public const string ActionCancel = "x";
    public const string ActionRestart = "r";
    public const string ActionConsentYes = "k1";
    public const string ActionConsentNo = "k0";

    public const string SkipToken = "-";
    private const int MaxAnswerLength = 500;
    private const int MaxSummaryValueLength = 60;

    private static readonly Regex ConsentRegex = new(
        "(kvkk|aydinlatma|kisisel veri|privacy|gizlilik|consent|onayliyorum|kabul ediyorum|i agree)", RegexOptions.Compiled);
    private static readonly Regex NationalIdRegex = new(
        @"(t\.?c\.?\s*kimlik|kimlik\s*no|national\s*id|social security)", RegexOptions.Compiled);

    /// <summary>Inceleme raporundaki atlanan alanlardan konusmayi baslatir.</summary>
    public static (TelegramConversationState State, TelegramTurn Turn) Start(string companyName, string jobTitle, JsonElement report)
    {
        var state = new TelegramConversationState();
        var seen = new HashSet<string>();
        string? nationalIdLabel = null;

        if (report.ValueKind == JsonValueKind.Object
            && report.TryGetProperty("skipped", out var skipped)
            && skipped.ValueKind == JsonValueKind.Array)
        {
            foreach (var f in skipped.EnumerateArray())
            {
                var label = f.TryGetProperty("label", out var l) ? l.GetString() ?? "" : "";
                var name = f.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                var required = f.TryGetProperty("required", out var r) && r.ValueKind == JsonValueKind.True;
                if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(label)) continue;

                var folded = Fold(label);
                if (ConsentRegex.IsMatch(folded)) { state.ConsentLabel ??= label; continue; }
                if (NationalIdRegex.IsMatch(folded)) { nationalIdLabel ??= label; continue; }
                if (seen.Add(name)) state.Questions.Add(new TelegramQuestion(name, label, required));
            }
        }

        var header = $"📝 {companyName} — {jobTitle}";

        if (nationalIdLabel is not null)
        {
            state.Step = TelegramStep.AppOnly;
            return (state, Turn(new TelegramReply(
                $"{header}\n🔒 \"{nationalIdLabel}\" alanı güvenlik nedeniyle Telegram'dan istenmez. " +
                "Başvuruyu uygulamadaki onay ekranından tamamlayın.")));
        }

        var intro = new TelegramReply(state.Questions.Count > 0
            ? $"{header}\nOnay için {state.Questions.Count} bilgi gerekiyor. Sırayla soracağım."
            : $"{header}\nForm dolduruldu, onayınız bekleniyor.");
        var replies = new List<TelegramReply> { intro };
        replies.AddRange(Enter(state, 0));
        return (state, new TelegramTurn(replies));
    }

    /// <summary>Kullanicinin yazdigi metni isler.</summary>
    public static TelegramTurn HandleText(TelegramConversationState state, string text)
    {
        if (state.Step == TelegramStep.AppOnly)
            return Turn(new TelegramReply("Bu başvuru uygulamadaki onay ekranından tamamlanmalı."));

        if (state.Step != TelegramStep.Question)
            return Turn(new TelegramReply("Lütfen mesajın altındaki butonlardan birini seçin."));

        var question = state.Questions[state.Index];
        var answer = text.Trim();

        if (answer == SkipToken)
        {
            if (question.Required)
                return Turn(new TelegramReply("Bu alan zorunlu, boş geçilemez. Lütfen cevabınızı yazın."));
        }
        else if (answer.Length == 0)
        {
            return Turn(new TelegramReply("Boş cevap kabul edilmez. Lütfen cevabınızı yazın."));
        }
        else
        {
            state.Answers[question.Name] = answer.Length > MaxAnswerLength ? answer[..MaxAnswerLength] : answer;
        }

        return new TelegramTurn(Enter(state, state.Index + 1));
    }

    /// <summary>Buton tiklamasini isler (data: TelegramConversation.Action* sabitlerinden biri).</summary>
    public static TelegramTurn HandleButton(TelegramConversationState state, string action)
    {
        switch (action)
        {
            case ActionConsentYes when state.Step == TelegramStep.Consent:
                state.ConsentAccepted = true;
                state.Step = TelegramStep.Confirm;
                return Turn(Summary(state));

            case ActionConsentNo when state.Step == TelegramStep.Consent:
                return Turn(new TelegramReply(
                    "Aydınlatma metni onaylanmadan başvuru gönderilemez. Onaylamak isterseniz yukarıdaki \"Evet\" butonuna basın."));

            case ActionConfirm when state.Step == TelegramStep.Confirm:
                return new TelegramTurn(new[] { new TelegramReply("⏳ Onaylandı, başvuru gönderiliyor...") }, TelegramAction.Approve);

            case ActionCancel when state.Step != TelegramStep.AppOnly:
                return new TelegramTurn(new[] { new TelegramReply("✖ Deneme iptal ediliyor...") }, TelegramAction.Cancel);

            case ActionRestart when state.Step is TelegramStep.Confirm or TelegramStep.Consent:
                state.Answers.Clear();
                state.ConsentAccepted = false;
                return new TelegramTurn(Enter(state, 0));

            default:
                return Turn(new TelegramReply("Bu buton şu an geçerli değil."));
        }
    }

    /// <summary>Onaylandiginda backend'e gidecek cevaplar (bos ise null).</summary>
    public static Dictionary<string, string>? ApprovalAnswers(TelegramConversationState state)
        => state.Answers.Count == 0 ? null : new Dictionary<string, string>(state.Answers);

    /// <summary>KVKK gerekmiyorsa onay kendiliginden verilmis sayilir (onay ekraniyla ayni kural).</summary>
    public static bool KvkkAccepted(TelegramConversationState state)
        => state.ConsentLabel is null || state.ConsentAccepted;

    // ---- yardimcilar ----

    /// <summary>Verilen soru sirasina gec; sorular bittiyse KVKK'ya, o da yoksa ozete.</summary>
    private static List<TelegramReply> Enter(TelegramConversationState state, int index)
    {
        state.Index = index;

        if (index < state.Questions.Count)
        {
            state.Step = TelegramStep.Question;
            return new List<TelegramReply> { Prompt(state, index) };
        }

        if (state.ConsentLabel is not null)
        {
            state.Step = TelegramStep.Consent;
            return new List<TelegramReply>
            {
                new($"🔒 Aydınlatma / KVKK onayı\n{state.ConsentLabel}",
                    new[] { new TelegramButton("Evet, onaylıyorum", ActionConsentYes), new TelegramButton("Hayır", ActionConsentNo) })
            };
        }

        state.Step = TelegramStep.Confirm;
        return new List<TelegramReply> { Summary(state) };
    }

    private static TelegramReply Prompt(TelegramConversationState state, int index)
    {
        var q = state.Questions[index];
        var hint = q.Required ? "zorunlu" : $"opsiyonel, geçmek için {SkipToken} yazın";
        return new TelegramReply($"❓ Soru {index + 1}/{state.Questions.Count} ({hint})\n{q.Label}");
    }

    private static TelegramReply Summary(TelegramConversationState state)
    {
        var lines = new List<string> { "📋 Özet" };
        foreach (var q in state.Questions)
        {
            var value = state.Answers.TryGetValue(q.Name, out var v)
                ? (v.Length > MaxSummaryValueLength ? v[..MaxSummaryValueLength] + "…" : v)
                : "(boş)";
            lines.Add($"• {q.Label}: {value}");
        }
        if (state.ConsentLabel is not null) lines.Add("• Aydınlatma metni: onaylandı");
        if (state.Questions.Count == 0 && state.ConsentLabel is null) lines.Add("Ek bilgi gerekmiyor.");

        return new TelegramReply(string.Join("\n", lines), new[]
        {
            new TelegramButton("✅ Onayla ve gönder", ActionConfirm),
            new TelegramButton("✏️ Baştan cevapla", ActionRestart),
            new TelegramButton("✖ Denemeyi iptal et", ActionCancel),
        });
    }

    private static TelegramTurn Turn(TelegramReply reply) => new(new[] { reply });

    private static string Fold(string s)
        => s.ToLower(new CultureInfo("tr-TR"))
            .Replace('ç', 'c').Replace('ğ', 'g').Replace('ı', 'i').Replace('ö', 'o').Replace('ş', 's').Replace('ü', 'u');
}

using System.Text.Json;
using FluentAssertions;
using JobHunter.Application.Automation;
using JobHunter.Application.Automation.Telegram;
using Xunit;

namespace JobHunter.Application.Tests.Automation;

public class TelegramConversationTests
{
    private const string Hybrid = "Denizli'de hibrit çalışmaya uygun musunuz?";
    private const string Consent = "Kişisel verilerimin başvuru süreci kapsamında işlenmesine ilişkin aydınlatma metnini okudum ve onaylıyorum.";

    private static JsonElement Report(params (string name, string label, bool required)[] skipped)
        => ReportWithOptions(skipped.Select(s => (s.name, s.label, s.required, (string[]?)null)).ToArray());

    private static JsonElement ReportWithOptions(params (string name, string label, bool required, string[]? options)[] skipped)
    {
        var json = JsonSerializer.Serialize(new
        {
            skipped = skipped.Select(s => new { s.name, s.label, s.required, s.options }),
        });
        return JsonDocument.Parse(json).RootElement.Clone();
    }

    private static TelegramConversationState Begin(out TelegramTurn turn, params (string, string, bool)[] skipped)
    {
        var (state, startTurn) = TelegramConversation.Start("Mock Teknoloji", "Junior .NET Developer", Report(skipped));
        turn = startTurn;
        return state;
    }

    [Fact]
    public void Start_AsksQuestionsInOrder_AndSeparatesConsent()
    {
        var state = Begin(out var turn,
            ("relocate", Hybrid, true),
            ("coverLetter", "Ön yazı", false),
            ("kvkkConsent", Consent, true));

        state.Questions.Select(q => q.Name).Should().Equal("relocate", "coverLetter");
        state.ConsentLabel.Should().Be(Consent);
        state.Step.Should().Be(TelegramStep.Question);
        turn.Replies.Should().HaveCount(2);
        turn.Replies[0].Text.Should().Contain("Mock Teknoloji").And.Contain("Junior .NET Developer");
        turn.Replies[1].Text.Should().Contain("Soru 1/2").And.Contain("zorunlu").And.Contain(Hybrid);
    }

    [Fact]
    public void Start_DeduplicatesFieldsByName()
    {
        var state = Begin(out _, ("city", "Şehir", true), ("city", "Şehir (adım 2)", true));

        state.Questions.Should().ContainSingle();
    }

    [Fact]
    public void Start_WithoutMissingFields_GoesStraightToConfirm()
    {
        var state = Begin(out var turn);

        state.Step.Should().Be(TelegramStep.Confirm);
        turn.Replies.Last().Buttons.Should().Contain(b => b.Data == TelegramConversation.ActionConfirm);
    }

    [Fact]
    public void Start_NationalIdField_IsNeverAskedOverTelegram()
    {
        var state = Begin(out var turn, ("tc", "T.C. Kimlik No", true), ("relocate", Hybrid, true));

        state.Step.Should().Be(TelegramStep.AppOnly);
        turn.Replies.Should().ContainSingle().Which.Text.Should().Contain("uygulamadaki onay ekranından");

        TelegramConversation.HandleButton(state, TelegramConversation.ActionConfirm).Action.Should().Be(TelegramAction.None);
    }

    [Fact]
    public void FullFlow_AnswersConsentAndConfirm_ProducesApproval()
    {
        var state = Begin(out _, ("relocate", Hybrid, true), ("kvkkConsent", Consent, true));

        var afterAnswer = TelegramConversation.HandleText(state, "  Evet ");
        state.Answers.Should().ContainKey("relocate").WhoseValue.Should().Be("Evet");
        state.Step.Should().Be(TelegramStep.Consent);
        afterAnswer.Replies.Single().Buttons.Should().HaveCount(2);

        var afterConsent = TelegramConversation.HandleButton(state, TelegramConversation.ActionConsentYes);
        state.Step.Should().Be(TelegramStep.Confirm);
        afterConsent.Replies.Single().Text.Should().Contain("Evet").And.Contain("onaylandı");

        var confirm = TelegramConversation.HandleButton(state, TelegramConversation.ActionConfirm);
        confirm.Action.Should().Be(TelegramAction.Approve);
        TelegramConversation.ApprovalAnswers(state).Should().BeEquivalentTo(new Dictionary<string, string> { ["relocate"] = "Evet" });
        TelegramConversation.KvkkAccepted(state).Should().BeTrue();
    }

    [Fact]
    public void RequiredQuestion_CannotBeSkipped_OptionalCan()
    {
        var state = Begin(out _, ("relocate", Hybrid, true), ("coverLetter", "Ön yazı", false));

        var refused = TelegramConversation.HandleText(state, TelegramConversation.SkipToken);
        refused.Replies.Single().Text.Should().Contain("zorunlu");
        state.Index.Should().Be(0);

        TelegramConversation.HandleText(state, "Evet");
        TelegramConversation.HandleText(state, TelegramConversation.SkipToken);

        state.Step.Should().Be(TelegramStep.Confirm);
        state.Answers.Should().NotContainKey("coverLetter");
    }

    [Fact]
    public void DecliningConsent_KeepsWaitingAndNeverApproves()
    {
        var state = Begin(out _, ("kvkkConsent", Consent, true));
        state.Step.Should().Be(TelegramStep.Consent);

        var declined = TelegramConversation.HandleButton(state, TelegramConversation.ActionConsentNo);
        declined.Action.Should().Be(TelegramAction.None);
        state.Step.Should().Be(TelegramStep.Consent);

        TelegramConversation.HandleButton(state, TelegramConversation.ActionConfirm).Action.Should().Be(TelegramAction.None);
        TelegramConversation.KvkkAccepted(state).Should().BeFalse();
    }

    [Fact]
    public void Restart_ClearsAnswersAndAsksAgain()
    {
        var state = Begin(out _, ("relocate", Hybrid, true));
        TelegramConversation.HandleText(state, "Evet");
        state.Step.Should().Be(TelegramStep.Confirm);

        var turn = TelegramConversation.HandleButton(state, TelegramConversation.ActionRestart);

        state.Step.Should().Be(TelegramStep.Question);
        state.Answers.Should().BeEmpty();
        turn.Replies.Single().Text.Should().Contain("Soru 1/1");
    }

    [Fact]
    public void Cancel_IsAvailableDuringQuestionsAndConfirm()
    {
        var state = Begin(out _, ("relocate", Hybrid, true));

        TelegramConversation.HandleButton(state, TelegramConversation.ActionCancel).Action.Should().Be(TelegramAction.Cancel);
    }

    [Fact]
    public void TextOutsideQuestionStep_IsRejectedWithoutChangingState()
    {
        var state = Begin(out _);   // dogrudan Confirm adimi

        var turn = TelegramConversation.HandleText(state, "merhaba");

        turn.Replies.Single().Text.Should().Contain("butonlardan");
        state.Step.Should().Be(TelegramStep.Confirm);
        state.Answers.Should().BeEmpty();
    }

    [Fact]
    public void NoConsentNeeded_MeansKvkkIsAccepted_ForNoConsentField()
    {
        var state = Begin(out _, ("relocate", Hybrid, true));

        TelegramConversation.KvkkAccepted(state).Should().BeTrue();
    }

    [Fact]
    public void LongAnswers_AreTruncated_AndSummaryIsShortened()
    {
        var state = Begin(out _, ("coverLetter", "Ön yazı", true));

        TelegramConversation.HandleText(state, new string('a', 900));

        state.Answers["coverLetter"].Length.Should().Be(500);
    }

    [Fact]
    public void State_SurvivesJsonRoundTrip()
    {
        var state = Begin(out _, ("relocate", Hybrid, true), ("kvkkConsent", Consent, true));
        TelegramConversation.HandleText(state, "Evet");

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        };
        var restored = JsonSerializer.Deserialize<TelegramConversationState>(JsonSerializer.Serialize(state, options), options)!;

        restored.Step.Should().Be(TelegramStep.Consent);
        restored.Answers.Should().BeEquivalentTo(state.Answers);
        restored.ConsentLabel.Should().Be(Consent);
    }

    // ---- Secimli (dropdown/radio) sorular ----

    private static readonly string[] English = { "Başlangıç", "Orta", "İleri" };

    private static TelegramConversationState BeginWithOptions(out TelegramTurn turn, bool required = true)
    {
        var (state, startTurn) = TelegramConversation.Start("Mock", "Dev",
            ReportWithOptions(("english", "İngilizce seviyeniz", required, English)));
        turn = startTurn;
        return state;
    }

    [Fact]
    public void OptionQuestion_IsShownAsButtons_WithOneButtonPerOption()
    {
        var state = BeginWithOptions(out var turn);

        state.Questions.Single().Options.Should().Equal(English);
        var prompt = turn.Replies.Last();
        prompt.Buttons!.Select(b => b.Text).Should().Equal(English);
        prompt.Text.Should().Contain("aşağıdan seçin");
    }

    [Fact]
    public void OptionQuestion_ButtonTap_RecordsExactlyThatOption()
    {
        var state = BeginWithOptions(out var turn);
        var data = turn.Replies.Last().Buttons![1].Data;

        TelegramConversation.HandleButton(state, data);

        state.Answers["english"].Should().Be("Orta");
        state.Step.Should().Be(TelegramStep.Confirm);
    }

    [Fact]
    public void OptionQuestion_WrongFreeText_IsRejected_NotRecorded_AndAsksAgain()
    {
        var state = BeginWithOptions(out _);

        var turn = TelegramConversation.HandleText(state, "iyi seviye");

        state.Answers.Should().BeEmpty();
        state.Step.Should().Be(TelegramStep.Question);
        turn.Replies.Should().HaveCount(2);
        turn.Replies[0].Text.Should().Contain("Geçersiz cevap");
        turn.Replies[1].Buttons.Should().HaveCount(English.Length);
        TelegramConversation.HandleButton(state, TelegramConversation.ActionConfirm).Action.Should().Be(TelegramAction.None);
    }

    [Theory]
    [InlineData("orta")]
    [InlineData("  ORTA ")]
    [InlineData("ileri")]
    [InlineData("baslangic")]
    public void OptionQuestion_TypedText_MatchingAnOption_IsAcceptedAsTheCanonicalOption(string typed)
    {
        var state = BeginWithOptions(out _);

        TelegramConversation.HandleText(state, typed);

        English.Should().Contain(state.Answers["english"]);
    }

    [Fact]
    public void OptionQuestion_StaleButton_FromAnotherQuestion_IsIgnored()
    {
        var state = BeginWithOptions(out _);

        var turn = TelegramConversation.HandleButton(state, "o7-0");

        state.Answers.Should().BeEmpty();
        turn.Replies.Single().Text.Should().Contain("artık geçerli değil");
    }

    [Fact]
    public void OptionQuestion_OutOfRangeButton_IsIgnored()
    {
        var state = BeginWithOptions(out _);

        TelegramConversation.HandleButton(state, "o0-99");

        state.Answers.Should().BeEmpty();
    }

    [Fact]
    public void OptionalOptionQuestion_CanBeSkippedWithButtonOrDash_RequiredCannot()
    {
        var optional = BeginWithOptions(out var turn, required: false);
        turn.Replies.Last().Buttons!.Last().Text.Should().Be("Geç");
        TelegramConversation.HandleButton(optional, turn.Replies.Last().Buttons!.Last().Data);
        optional.Step.Should().Be(TelegramStep.Confirm);

        var required = BeginWithOptions(out _);
        TelegramConversation.HandleButton(required, "s0");
        required.Step.Should().Be(TelegramStep.Question);
        TelegramConversation.HandleText(required, TelegramConversation.SkipToken);
        required.Step.Should().Be(TelegramStep.Question);
    }

    // ---- Tarih alanlari ----

    private static TelegramConversationState BeginWithDate(out TelegramTurn turn)
    {
        var json = JsonSerializer.Serialize(new { skipped = new[] { new { name = "birthDate", label = "Doğum tarihi", required = false, type = "date" } } });
        var (state, startTurn) = TelegramConversation.Start("Mock", "Dev", JsonDocument.Parse(json).RootElement.Clone());
        turn = startTurn;
        return state;
    }

    [Theory]
    [InlineData("24.06.1998", "1998-06-24")]
    [InlineData("24/06/1998", "1998-06-24")]
    [InlineData("24-06-1998", "1998-06-24")]
    [InlineData("1.2.1999", "1999-02-01")]
    [InlineData("1998-06-24", "1998-06-24")]
    [InlineData("  24.06.1998 ", "1998-06-24")]
    public void DateQuestion_AcceptedFormats_AreStoredAsIso(string typed, string expected)
    {
        var state = BeginWithDate(out _);

        TelegramConversation.HandleText(state, typed);

        state.Answers["birthDate"].Should().Be(expected);
        state.Step.Should().Be(TelegramStep.Confirm);
    }

    [Theory]
    [InlineData("31.02.1998")]
    [InlineData("yirmi dört haziran")]
    [InlineData("1998.06.24")]
    [InlineData("24.06")]
    public void DateQuestion_InvalidDate_IsRejected_AndNotRecorded(string typed)
    {
        var state = BeginWithDate(out _);

        var turn = TelegramConversation.HandleText(state, typed);

        state.Answers.Should().BeEmpty();
        state.Step.Should().Be(TelegramStep.Question);
        turn.Replies[0].Text.Should().Contain("Geçersiz tarih").And.Contain("GG.AA.YYYY");
    }

    [Fact]
    public void DateQuestion_PromptTellsTheExpectedFormat()
    {
        BeginWithDate(out var turn);

        turn.Replies.Last().Text.Should().Contain("GG.AA.YYYY");
    }
}

public class ApprovalAnswerValidatorTests
{
    private const string Report = """
        { "skipped": [
            { "name": "english", "label": "İngilizce seviyeniz", "required": true, "options": ["Başlangıç", "Orta", "İleri"] },
            { "name": "birthDate", "label": "Doğum tarihi", "required": false, "type": "date" },
            { "name": "coverLetter", "label": "Ön yazı", "required": false }
        ] }
        """;

    private static JsonElement Answers(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static string? Error(string? report, string? answers)
        => ApprovalAnswerValidator.Validate(report, answers is null ? null : Answers(answers)).Error;

    [Fact]
    public void ValidOption_Passes()
        => Error(Report, """{ "english": "Orta" }""").Should().BeNull();

    [Fact]
    public void ValueOutsideOptions_IsRejected_WithAllowedListInMessage()
        => Error(Report, """{ "english": "iyi" }""").Should().Contain("İngilizce seviyeniz").And.Contain("Başlangıç").And.Contain("Orta");

    [Fact]
    public void FreeTextFields_AndEmptyAnswers_AreNotValidated()
        => Error(Report, """{ "coverLetter": "herhangi bir şey", "english": "" }""").Should().BeNull();

    [Fact]
    public void OldReportsWithoutOptionsOrType_AreNotValidated()
    {
        const string old = """{ "skipped": [ { "name": "english", "label": "x", "required": true } ] }""";

        Error(old, """{ "english": "ne olursa" }""").Should().BeNull();
    }

    [Fact]
    public void NoReportOrNoAnswers_IsNotValidated()
    {
        Error(null, """{ "english": "x" }""").Should().BeNull();
        Error(Report, null).Should().BeNull();
    }

    [Fact]
    public void DateAnswer_IsNormalizedToIso_AndOtherAnswersArePreserved()
    {
        var result = ApprovalAnswerValidator.Validate(Report, Answers("""{ "birthDate": "24.06.1998", "english": "Orta", "coverLetter": "merhaba" }"""));

        result.Error.Should().BeNull();
        var answers = result.Answers!.Value;
        answers.GetProperty("birthDate").GetString().Should().Be("1998-06-24");
        answers.GetProperty("english").GetString().Should().Be("Orta");
        answers.GetProperty("coverLetter").GetString().Should().Be("merhaba");
    }

    [Fact]
    public void InvalidDate_IsRejected_WithFormatHint()
        => Error(Report, """{ "birthDate": "31.02.1998" }""").Should().Contain("Doğum tarihi").And.Contain("GG.AA.YYYY");
}

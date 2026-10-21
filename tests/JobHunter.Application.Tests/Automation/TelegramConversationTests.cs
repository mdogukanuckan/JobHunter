using System.Text.Json;
using FluentAssertions;
using JobHunter.Application.Automation.Telegram;
using Xunit;

namespace JobHunter.Application.Tests.Automation;

public class TelegramConversationTests
{
    private const string Hybrid = "Denizli'de hibrit çalışmaya uygun musunuz?";
    private const string Consent = "Kişisel verilerimin başvuru süreci kapsamında işlenmesine ilişkin aydınlatma metnini okudum ve onaylıyorum.";

    private static JsonElement Report(params (string name, string label, bool required)[] skipped)
    {
        var json = JsonSerializer.Serialize(new
        {
            skipped = skipped.Select(s => new { s.name, s.label, s.required }),
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
}

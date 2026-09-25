using JobHunter.Application.Common.Interfaces;
using JobHunter.Domain.Automation;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Automation;

/// <summary>
/// Is durumunu degistirmenin TEK yolu. Hem kullanici iptali hem n8n callback'i buradan gecer, boylece:
///  - gecis kurallari (AutomationJobTransitions) her zaman uygulanir,
///  - StartedAt / FinishedAt zaman damgalari tutarli dolar,
///  - her durum degisikligi gunluge (Events) otomatik yazilir.
/// </summary>
internal static class AutomationWorkflow
{
    /// <returns>Durum gercekten degistiyse true; ayni durum tekrar geldiyse false (idempotent, hata degil).</returns>
    public static bool ChangeStatus(
        IApplicationDbContext context,
        AutomationJob job,
        AutomationJobStatus to,
        string? message,
        string source,
        string? errorMessage = null,
        string? resultSummary = null)
    {
        if (job.Status == to) return false;

        if (!AutomationJobTransitions.CanTransition(job.Status, to))
        {
            throw new AutomationConflictException(AutomationJobTransitions.IsTerminal(job.Status)
                ? $"Bu is zaten bitmis ({job.Status}); durumu degistirilemez."
                : $"{job.Status} durumundan {to} durumuna gecilemez.");
        }

        var now = DateTime.UtcNow;
        var from = job.Status;
        job.Status = to;
        job.UpdatedAt = now;

        if (to == AutomationJobStatus.Running) job.StartedAt ??= now;
        if (AutomationJobTransitions.IsTerminal(to)) job.FinishedAt = now;
        if (to == AutomationJobStatus.Failed) job.ErrorMessage = Clean(errorMessage) ?? Clean(message) ?? "Bilinmeyen hata.";
        if (to == AutomationJobStatus.Completed) job.ResultSummary = Clean(resultSummary) ?? Clean(message);
        // Faz 11 gizlilik kurali: onay cevaplari (TC kimlik dahil) is bitince (terminal) silinir.
        if (AutomationJobTransitions.IsTerminal(to)) job.ApprovalAnswersJson = null;

        var text = $"{from} → {to} ({source})";
        if (Clean(message) is { } m) text += $": {m}";
        if (to == AutomationJobStatus.Failed && job.ErrorMessage != Clean(message)) text += $" | Hata: {job.ErrorMessage}";

        AddEvent(context, job,
            to == AutomationJobStatus.Failed ? AutomationEventLevel.Error : AutomationEventLevel.Info,
            "status_changed",
            text);
        return true;
    }

    /// <summary>
    /// Gunluge satir ekler. DbSet'e ACIKCA Add edilir: Id'si onceden dolu (Guid.NewGuid) bir entity sadece
    /// navigation'a eklenirse EF onu "var olan kayit" sanip UPDATE atabilir.
    /// </summary>
    public static AutomationJobEvent AddEvent(
        IApplicationDbContext context,
        AutomationJob job, AutomationEventLevel level, string? step, string message, string? dataJson = null)
    {
        var e = new AutomationJobEvent
        {
            AutomationJobId = job.Id,
            AutomationJob = job,
            Level = level,
            Step = step,
            Message = Truncate(message, 2000),
            DataJson = dataJson
        };
        context.AutomationJobEvents.Add(e);
        if (!job.Events.Contains(e)) job.Events.Add(e);
        return e;
    }

    public static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static string Truncate(string value, int max) => value.Length <= max ? value : value[..(max - 1)] + "…";
}

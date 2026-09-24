using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Automation;

/// <summary>
/// AutomationJob durum makinesi: hangi durumdan hangisine gecilebilir.
/// Kurallar tek yerde durur; hem kullanici (iptal) hem n8n (callback) istekleri buradan kontrol edilir.
/// </summary>
public static class AutomationJobTransitions
{
    private static readonly IReadOnlyDictionary<AutomationJobStatus, AutomationJobStatus[]> Allowed =
        new Dictionary<AutomationJobStatus, AutomationJobStatus[]>
        {
            [AutomationJobStatus.Queued] =
                [AutomationJobStatus.Running, AutomationJobStatus.Failed, AutomationJobStatus.Cancelled],
            [AutomationJobStatus.Running] =
                [AutomationJobStatus.AwaitingApproval, AutomationJobStatus.Completed, AutomationJobStatus.Failed, AutomationJobStatus.Cancelled],
            // Onay verilince tekrar Running'e doner (formu gondermeye devam eder).
            [AutomationJobStatus.AwaitingApproval] =
                [AutomationJobStatus.Running, AutomationJobStatus.Completed, AutomationJobStatus.Failed, AutomationJobStatus.Cancelled],
            [AutomationJobStatus.Completed] = [],
            [AutomationJobStatus.Failed] = [],
            [AutomationJobStatus.Cancelled] = [],
        };

    public static bool CanTransition(AutomationJobStatus from, AutomationJobStatus to)
        => Allowed.TryGetValue(from, out var targets) && targets.Contains(to);

    /// <summary>Bitmis mi (bir daha degismez).</summary>
    public static bool IsTerminal(AutomationJobStatus status)
        => status is AutomationJobStatus.Completed or AutomationJobStatus.Failed or AutomationJobStatus.Cancelled;

    /// <summary>Devam ediyor mu. Bir basvurunun ayni anda en fazla bir aktif denemesi olabilir.</summary>
    public static bool IsActive(AutomationJobStatus status) => !IsTerminal(status);

    /// <summary>EF sorgularinda kullanmak icin aktif durumlar listesi.</summary>
    public static readonly AutomationJobStatus[] ActiveStatuses =
        [AutomationJobStatus.Queued, AutomationJobStatus.Running, AutomationJobStatus.AwaitingApproval];
}

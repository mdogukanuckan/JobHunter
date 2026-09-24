using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Bir basvuru icin tek bir otomatik basvuru DENEMESI (JobApplication 1-N AutomationJob).
/// Her deneme yeni bir satirdir; eski denemeler gecmis olarak kalir (neden basarisiz oldugu gorulebilsin).
/// Sahiplik basvuru uzerinden belirlenir (JobApplication.UserId), ayri UserId tutulmaz.
///
/// Akis: kullanici baslatir (Queued) → backend n8n'e webhook atar → n8n calistikca
/// callback endpoint'leriyle durum (Status) ve gunluk (Events) gonderir.
/// </summary>
public class AutomationJob : BaseEntity
{
    public Guid JobApplicationId { get; set; }
    public JobApplication JobApplication { get; set; } = null!;

    /// <summary>Bu basvurunun kacinci denemesi (1, 2, 3...).</summary>
    public int AttemptNumber { get; set; }

    public AutomationMode Mode { get; set; } = AutomationMode.HumanApproval;
    public AutomationJobStatus Status { get; set; } = AutomationJobStatus.Queued;

    /// <summary>
    /// Bu denemede gonderilecek CV. Baslatildigi anda secilir (basvurunun CV'si, yoksa profildeki varsayilan)
    /// ve sabitlenir: kullanici sonra varsayilan CV'yi degistirse bile bu deneme ayni dosyayla devam eder.
    /// </summary>
    public Guid? CvId { get; set; }
    public Cv? Cv { get; set; }

    // CreatedAt = kuyruga girdigi an.
    public DateTime? StartedAt { get; set; }    // Ilk kez Running'e gectigi an
    public DateTime? FinishedAt { get; set; }   // Completed / Failed / Cancelled oldugu an

    /// <summary>Failed ise nedeni (n8n'in gonderdigi hata veya "n8n'e ulasilamadi").</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>Completed ise kisa sonuc, orn. "Basvuru gonderildi, onay e-postasi bekleniyor".</summary>
    public string? ResultSummary { get; set; }

    public ICollection<AutomationJobEvent> Events { get; set; } = new List<AutomationJobEvent>();
}

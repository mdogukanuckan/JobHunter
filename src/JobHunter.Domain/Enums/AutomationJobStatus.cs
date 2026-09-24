namespace JobHunter.Domain.Enums;

/// <summary>
/// Bir otomasyon denemesinin (AutomationJob) yasam dongusu.
///
///   Queued ──► Running ──► AwaitingApproval ──► Running ... ──► Completed
///     │           │               │
///     └───────────┴───────────────┴──► Failed / Cancelled
///
/// Completed, Failed, Cancelled "bitmis" (terminal) durumlardir; bir daha degismez.
/// Tekrar denemek = ayni basvuru icin YENI bir AutomationJob (Faz 0 karari: 1-N).
/// Gecerli gecisler: JobHunter.Domain.Automation.AutomationJobTransitions.
/// </summary>
public enum AutomationJobStatus
{
    Queued,            // Olusturuldu, n8n'e bildirildi, henuz baslamadi
    Running,           // n8n / tarayici otomasyonu calisiyor
    AwaitingApproval,  // Insan onayi bekleniyor (Faz 11: AskFirst alanlari, gonderim oncesi kontrol)
    Completed,         // Basvuru basariyla tamamlandi
    Failed,            // Hata ile bitti (ErrorMessage dolu)
    Cancelled          // Kullanici iptal etti
}

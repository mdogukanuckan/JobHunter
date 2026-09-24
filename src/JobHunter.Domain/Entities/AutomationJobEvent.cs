using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Otomasyon denemesinin adim adim gunlugu (AutomationJob 1-N AutomationJobEvent).
/// Ornek: "Ilan sayfasi acildi", "CV yuklendi", "Maas alani AskFirst: onay bekleniyor".
/// Durum degisiklikleri de otomatik olarak buraya yazilir. Faz 14 panosu bu zaman cizelgesini gosterir.
/// CreatedAt = olayin kaydedildigi an.
/// </summary>
public class AutomationJobEvent : BaseEntity
{
    public Guid AutomationJobId { get; set; }
    public AutomationJob AutomationJob { get; set; } = null!;

    public AutomationEventLevel Level { get; set; } = AutomationEventLevel.Info;

    /// <summary>Makine tarafindan okunabilir adim adi, orn. "open_page", "fill_form", "upload_cv". Opsiyonel.</summary>
    public string? Step { get; set; }

    /// <summary>Insan tarafindan okunacak aciklama.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Istege bagli ek veri (JSON metni), orn. doldurulan alanlar, ekran goruntusu linki. PostgreSQL'de jsonb.</summary>
    public string? DataJson { get; set; }
}

using JobHunter.Domain.Enums;

namespace JobHunter.Application.Automation.Interfaces;

/// <summary>
/// Kuyruga giren isi otomasyon motoruna (n8n) haber verir. Faz 0 karari: polling degil, webhook PUSH.
/// Application katmani n8n'in nasil cagrildigini bilmez; implementasyon Infrastructure'dadir.
///   Faz 8: LoggingAutomationDispatcher → sadece log yazar (n8n olmadan test edilebilsin).
///   Faz 9: N8nWebhookDispatcher → Automation:N8nWebhookUrl adresine gercek HTTP POST.
/// Hata olursa exception firlatir; is Failed olarak isaretlenir.
/// </summary>
public interface IAutomationDispatcher
{
    Task DispatchAsync(AutomationDispatchMessage message, CancellationToken cancellationToken = default);
}

/// <summary>
/// n8n webhook'una gidecek kucuk mesaj. Kisisel veri ICERMEZ: n8n tam veriyi
/// PayloadUrl'den API anahtariyla kendisi ceker (boylece veri webhook loglarinda kalmaz).
/// </summary>
public record AutomationDispatchMessage(
    Guid JobId,
    Guid JobApplicationId,
    int AttemptNumber,
    AutomationMode Mode,
    string CompanyName,
    string JobTitle,
    string? JobUrl,
    string PayloadUrl,
    string StatusUrl,
    string EventsUrl);

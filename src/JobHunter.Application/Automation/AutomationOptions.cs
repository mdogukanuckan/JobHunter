namespace JobHunter.Application.Automation;

/// <summary>
/// appsettings.json → "Automation" bolumu. Gizli degerler (ApiKey) user-secrets / ortam degiskeninde tutulur.
/// </summary>
public class AutomationOptions
{
    /// <summary>
    /// n8n'in backend'e callback atarken "X-Automation-Key" header'inda gonderecegi gizli anahtar.
    /// Bos ise callback endpoint'leri kapali kalir (503).
    /// </summary>
    public string? ApiKey { get; init; }

    /// <summary>
    /// Is kuyruga girince backend'in POST atacagi n8n Webhook node adresi,
    /// orn. "http://localhost:5678/webhook/jobhunter-apply". Bos ise n8n'e istek atilmaz, sadece loglanir.
    /// </summary>
    public string? N8nWebhookUrl { get; init; }

    /// <summary>
    /// Backend → n8n yonu icin gizli anahtar. Webhook isteginde "X-JobHunter-Secret" header'inda gider;
    /// n8n'deki Webhook node'u (Header Auth credential'i) bunu dogrular. ApiKey'den (n8n → backend) AYRI tutulur:
    /// biri sizarsa digeri guvende kalir. Gizli deger: user-secrets.
    /// </summary>
    public string? N8nWebhookSecret { get; init; }

    /// <summary>
    /// n8n'in backend'e ulasacagi adres, orn. "http://host.docker.internal:5080".
    /// Veri paketindeki CV indirme linki bununla tam URL'ye cevrilir; bossa goreli yol verilir.
    /// </summary>
    public string? PublicBaseUrl { get; init; }

    /// <summary>Goreli yolu (orn. "/api/automation/n8n/jobs/.../cv") PublicBaseUrl ile tam adrese cevirir.</summary>
    public string BuildUrl(string path)
        => string.IsNullOrWhiteSpace(PublicBaseUrl) ? path : PublicBaseUrl.TrimEnd('/') + path;
}

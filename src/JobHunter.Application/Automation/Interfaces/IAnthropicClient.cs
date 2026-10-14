namespace JobHunter.Application.Automation.Interfaces;

/// <summary>
/// Faz 10b: Anthropic Messages API'sine tek seferlik, arac (tool) kullanmayan basit bir
/// metin-icin-metin cagrisi. Application katmani Anthropic'in HTTP detaylarini (endpoint,
/// header, istek/yanit sekli) bilmez; implementasyon Infrastructure'dadir (N8nWebhookDispatcher
/// ile ayni desen).
///
/// Automation:AnthropicApiKey bos ise implementasyon InvalidOperationException firlatir;
/// cagiran taraf (FieldMappingService) bunu yakalayip "AI eslestirme kapali" olarak yorumlamalidir.
/// </summary>
public interface IAnthropicClient
{
    /// <summary>Modelin dondurdugu ham metni (genelde JSON) dondurur.</summary>
    Task<string> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken cancellationToken = default);
}

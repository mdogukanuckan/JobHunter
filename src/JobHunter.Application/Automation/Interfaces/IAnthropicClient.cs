namespace JobHunter.Application.Automation.Interfaces;

/// <summary>
/// Faz 10b: Anthropic Messages API'sine tek seferlik, arac (tool) kullanmayan basit bir
/// metin-icin-metin cagrisi. Application katmani Anthropic'in HTTP detaylarini (endpoint,
/// header, istek/yanit sekli) bilmez; implementasyon Infrastructure'dadir (N8nWebhookDispatcher
/// ile ayni desen).
///
/// Anahtar CAGIRAN tarafindan verilir (kullanicinin kendi sifreli anahtari ya da yedek olarak sistem anahtari);
/// bos ise InvalidOperationException firlatilir, FieldMappingService bunu "AI eslestirme kapali" olarak yorumlar.
/// </summary>
public interface IAnthropicClient
{
    /// <summary>Modelin dondurdugu ham metni (genelde JSON) dondurur.</summary>
    /// <param name="maxTokens">Cikti ust siniri; verilmezse eslestirme icin varsayilan (buyuk) deger.</param>
    Task<string> CompleteAsync(string apiKey, string systemPrompt, string userPrompt, int? maxTokens = null, CancellationToken cancellationToken = default);
}

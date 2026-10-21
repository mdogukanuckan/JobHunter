using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using JobHunter.Application.Automation;
using JobHunter.Application.Automation.Interfaces;
using Microsoft.Extensions.Logging;

namespace JobHunter.Infrastructure.Automation;

/// <summary>
/// Faz 10b: Anthropic Messages API'sine (https://api.anthropic.com/v1/messages) tek mesajlik,
/// arac (tool) kullanmayan basit bir cagri. N8nWebhookDispatcher ile ayni desen: HttpClient
/// DI fabrikasindan alinir, hata durumunda anlamli exception firlatilir.
///
/// Sadece FieldMappingService bunu kullanir; o servis Claude'a hicbir profil DEGERI gondermez,
/// sadece form alani metadatasi + adayin kendi soru/etiket metinlerinden olusan bir "menu" gonderir.
/// </summary>
public class AnthropicClient : IAnthropicClient
{
    private const string ApiUrl = "https://api.anthropic.com/v1/messages";
    private const string ApiVersion = "2023-06-01";
    private const int MaxOutputTokens = 4096;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _httpClient;
    private readonly AutomationOptions _options;
    private readonly ILogger<AnthropicClient> _logger;

    public AnthropicClient(HttpClient httpClient, AutomationOptions options, ILogger<AnthropicClient> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
    }

    public async Task<string> CompleteAsync(string apiKey, string systemPrompt, string userPrompt, int? maxTokens = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Anthropic API anahtari yok; AI destekli alan eslestirmesi kapali.");

        var body = new AnthropicRequest(
            _options.AnthropicModel,
            maxTokens ?? MaxOutputTokens,
            systemPrompt,
            [new AnthropicMessage("user", userPrompt)]);

        using var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl)
        {
            Content = JsonContent.Create(body, options: JsonOptions),
        };
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", ApiVersion);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"Anthropic API {_httpClient.Timeout.TotalSeconds:0} saniyede yanit vermedi.", ex);
        }

        using (response)
        {
            var raw = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var hint = (int)response.StatusCode switch
                {
                    401 => " (Anthropic API anahtari gecersiz.)",
                    429 => " (Kota/hiz siniri asildi.)",
                    _ => "",
                };
                throw new HttpRequestException(
                    $"Anthropic API {(int)response.StatusCode} dondu{hint} {Truncate(raw, 300)}".TrimEnd(),
                    null, response.StatusCode);
            }

            var parsed = JsonSerializer.Deserialize<AnthropicResponse>(raw, JsonOptions)
                ?? throw new HttpRequestException("Anthropic API bos yanit dondu.");

            var text = parsed.Content?.FirstOrDefault(c => c.Type == "text")?.Text;
            if (string.IsNullOrWhiteSpace(text))
                throw new HttpRequestException("Anthropic API yanitinda metin bulunamadi.");

            _logger.LogInformation(
                "[Automation] Faz 10b: Claude API alan eslestirmesi cagrildi (model {Model}, giris {InTok}/cikis {OutTok} token).",
                _options.AnthropicModel, parsed.Usage?.InputTokens, parsed.Usage?.OutputTokens);

            return text;
        }
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max] + "…";

    private record AnthropicRequest(string Model, int MaxTokens, string System, AnthropicMessage[] Messages);
    private record AnthropicMessage(string Role, string Content);
    private record AnthropicResponse(List<AnthropicContentBlock>? Content, AnthropicUsage? Usage);
    private record AnthropicContentBlock(string Type, string? Text);
    private record AnthropicUsage(int InputTokens, int OutputTokens);
}

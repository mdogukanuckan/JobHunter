using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using JobHunter.Application.Automation;
using JobHunter.Application.Automation.Interfaces;
using Microsoft.Extensions.Logging;

namespace JobHunter.Infrastructure.Automation;

/// <summary>
/// Faz 9 dispatcher'i: is kuyruga girince n8n'deki Webhook node'una gercek HTTP POST atar.
///
/// Gonderilen govde AutomationDispatchMessage'dir (kisisel veri YOK, sadece is kimligi ve callback linkleri).
/// n8n tam veriyi PayloadUrl'den X-Automation-Key ile kendisi ceker.
///
/// Guvenlik: "X-JobHunter-Secret" header'i ile Automation:N8nWebhookSecret gonderilir. n8n'deki Webhook
/// node'u "Header Auth" credential'i ile bunu kontrol eder; anahtarsiz gelen istegi 403 ile reddeder.
///
/// Hata olursa exception firlatir: AutomationJobService bunu yakalar ve isi Failed yapar
/// (orn. n8n kapali, workflow aktif degil → n8n 404 doner, anahtar yanlis → 403).
/// </summary>
public class N8nWebhookDispatcher : IAutomationDispatcher
{
    public const string SecretHeaderName = "X-JobHunter-Secret";

    // Enum'lar metin olarak gitsin ("HumanApproval"), alan adlari camelCase ("jobId").
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly HttpClient _httpClient;
    private readonly AutomationOptions _options;
    private readonly ILogger<N8nWebhookDispatcher> _logger;

    public N8nWebhookDispatcher(HttpClient httpClient, AutomationOptions options, ILogger<N8nWebhookDispatcher> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
    }

    public async Task DispatchAsync(AutomationDispatchMessage message, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.N8nWebhookUrl))
            throw new InvalidOperationException("Automation:N8nWebhookUrl yapilandirilmamis.");
        if (string.IsNullOrWhiteSpace(_options.N8nWebhookSecret))
            throw new InvalidOperationException("Automation:N8nWebhookSecret yapilandirilmamis (user-secrets).");

        using var request = new HttpRequestMessage(HttpMethod.Post, _options.N8nWebhookUrl)
        {
            Content = JsonContent.Create(message, options: JsonOptions)
        };
        request.Headers.Add(SecretHeaderName, _options.N8nWebhookSecret);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            // HttpClient zaman asimi TaskCanceledException (OperationCanceledException) firlatir.
            // AutomationJobService iptal exception'larini yakalamaz; is Queued'da takili kalmasin diye
            // bunu normal bir hataya ceviriyoruz → is Failed olur.
            throw new TimeoutException($"n8n webhook {_httpClient.Timeout.TotalSeconds:0} saniyede yanit vermedi.", ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                var hint = (int)response.StatusCode switch
                {
                    404 => " (Workflow aktif degil veya webhook yolu yanlis olabilir.)",
                    401 or 403 => " (X-JobHunter-Secret n8n'deki credential ile eslesmiyor olabilir.)",
                    _ => ""
                };
                throw new HttpRequestException(
                    $"n8n webhook {(int)response.StatusCode} dondu{hint} {Truncate(body, 300)}".TrimEnd(),
                    null, response.StatusCode);
            }
        }

        _logger.LogInformation("[Automation] Is {JobId} (deneme #{Attempt}) n8n'e iletildi.", message.JobId, message.AttemptNumber);
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max] + "…";
}

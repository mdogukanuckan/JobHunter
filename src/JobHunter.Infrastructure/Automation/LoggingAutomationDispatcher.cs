using JobHunter.Application.Automation;
using JobHunter.Application.Automation.Interfaces;
using Microsoft.Extensions.Logging;

namespace JobHunter.Infrastructure.Automation;

/// <summary>
/// Faz 8 dispatcher'i: n8n'e gercek istek ATMAZ, sadece ne gonderecegini loglar.
/// Boylece backend n8n kurulmadan test edilebilir: is Queued kalir, n8n'in yapacagi callback'leri
/// Swagger / Postman ile elle atarak tum akis denenir.
/// Faz 9'da yerini Automation:N8nWebhookUrl'e HTTP POST atan N8nWebhookDispatcher alacak
/// (DependencyInjection.cs'te tek satir degisir, baska hicbir kod degismez: arayuzun faydasi bu).
/// </summary>
public class LoggingAutomationDispatcher : IAutomationDispatcher
{
    private readonly ILogger<LoggingAutomationDispatcher> _logger;
    private readonly AutomationOptions _options;

    public LoggingAutomationDispatcher(ILogger<LoggingAutomationDispatcher> logger, AutomationOptions options)
    {
        _logger = logger;
        _options = options;
    }

    public Task DispatchAsync(AutomationDispatchMessage message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "[Automation] Is kuyrukta: {JobId} (deneme #{Attempt}, {Mode}) {Company} / {Title}. " +
            "n8n webhook: {WebhookUrl} (Faz 8: istek gonderilmedi). Veri paketi: {PayloadUrl}",
            message.JobId, message.AttemptNumber, message.Mode, message.CompanyName, message.JobTitle,
            string.IsNullOrWhiteSpace(_options.N8nWebhookUrl) ? "(ayarlanmamis)" : _options.N8nWebhookUrl,
            message.PayloadUrl);

        return Task.CompletedTask;
    }
}

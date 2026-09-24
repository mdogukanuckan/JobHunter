using JobHunter.Application.Automation;
using JobHunter.Application.Automation.Interfaces;
using Microsoft.Extensions.Logging;

namespace JobHunter.Infrastructure.Automation;

/// <summary>
/// n8n'e istek ATMAYAN dispatcher: sadece ne gonderecegini loglar.
/// Automation:N8nWebhookUrl bossa kullanilir (bkz. DependencyInjection.cs); boylece n8n kapaliyken de
/// backend calisir, n8n'in callback'leri Swagger / Postman ile elle atilarak akis denenebilir.
/// Adres ayarliysa yerine N8nWebhookDispatcher gecer.
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
            "n8n webhook: {WebhookUrl} (istek gonderilmedi: LoggingAutomationDispatcher). Veri paketi: {PayloadUrl}",
            message.JobId, message.AttemptNumber, message.Mode, message.CompanyName, message.JobTitle,
            string.IsNullOrWhiteSpace(_options.N8nWebhookUrl) ? "(ayarlanmamis)" : _options.N8nWebhookUrl,
            message.PayloadUrl);

        return Task.CompletedTask;
    }
}

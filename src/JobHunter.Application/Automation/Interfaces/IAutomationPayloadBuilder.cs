using JobHunter.Application.Automation.Dtos;

namespace JobHunter.Application.Automation.Interfaces;

/// <summary>
/// Veri paketini olusturur. Sahiplik kontrolu YAPMAZ: cagiran taraf (kullanici servisi veya
/// API anahtarli callback) isin erisilebilir oldugundan emin olmalidir.
/// </summary>
public interface IAutomationPayloadBuilder
{
    Task<AutomationPayload> BuildAsync(Guid jobId, CancellationToken cancellationToken = default);
}

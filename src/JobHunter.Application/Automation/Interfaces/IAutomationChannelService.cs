using JobHunter.Application.Automation.Dtos;

namespace JobHunter.Application.Automation.Interfaces;

/// <summary>
/// Kullanici adina, JWT OLMADAN yapilan onay/iptal: Telegram gibi guvenilir bir kanaldan gelir.
/// Kimlik dogrulamasi cagiranin sorumlulugudur (Telegram icin: sadece yapilandirilmis chat id kabul edilir),
/// bu yuzden bu arayuz controller'lara DEGIL, sadece kanal servislerine verilir.
/// Is kurallari kullanici yoluyla ayni (AwaitingApproval kontrolu, KVKK zorunlulugu, n8n'e Submit bildirimi).
/// </summary>
public interface IAutomationChannelService
{
    Task<AutomationJobResponse> ApproveFromChannelAsync(Guid jobId, ApproveAutomationRequest request, string channel, CancellationToken cancellationToken = default);

    Task<AutomationJobResponse> CancelFromChannelAsync(Guid jobId, string reason, string channel, CancellationToken cancellationToken = default);
}

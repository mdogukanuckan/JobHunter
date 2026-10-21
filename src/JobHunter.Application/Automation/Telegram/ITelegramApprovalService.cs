namespace JobHunter.Application.Automation.Telegram;

/// <summary>
/// Onay bekleyen otomasyon denemelerinin eksik alanlarini Telegram sohbetinden doldurma akisi.
/// Arka plan servisi (Infrastructure) bunu periyodik cagirir; konusma durumu veritabaninda tutulur,
/// bu yuzden backend yeniden baslasa da konusma kaldigi yerden devam eder.
/// </summary>
public interface ITelegramApprovalService
{
    /// <summary>Onay bekleyen ama henuz konusmasi baslamamis denemeler icin ilk mesaji gonderir.</summary>
    Task StartPendingConversationsAsync(CancellationToken cancellationToken = default);

    /// <summary>Gelen bir mesaji ya da buton tiklamasini isler. Yapilandirilan sohbet disindakiler yok sayilir.</summary>
    Task HandleUpdateAsync(TelegramUpdate update, CancellationToken cancellationToken = default);
}

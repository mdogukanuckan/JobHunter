namespace JobHunter.Application.Automation.Telegram;

/// <summary>
/// appsettings.json → "Telegram" bolumu. BotToken gizlidir: user-secrets / ortam degiskeni.
/// Ikisi de doluysa backend Telegram'i dinler ve eksik alanlar bot uzerinden doldurulabilir;
/// aksi halde ozellik tamamen kapali kalir.
/// </summary>
public class TelegramOptions
{
    public string? BotToken { get; init; }

    /// <summary>
    /// Mesajlari kabul edilen TEK sohbet. Baska bir sohbetten gelen her sey sessizce yok sayilir.
    /// (n8n'deki TELEGRAM_CHAT_ID ile ayni deger.)
    /// </summary>
    public long? ChatId { get; init; }

    public bool IsEnabled => !string.IsNullOrWhiteSpace(BotToken) && ChatId is not null;
}

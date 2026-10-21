namespace JobHunter.Application.Automation.Telegram;

/// <summary>
/// Telegram Bot API'ye acilan kapi. Application katmani HTTP'yi bilmez; implementasyon Infrastructure'dadir.
/// </summary>
public interface ITelegramGateway
{
    /// <param name="offset">Bu id'den onceki guncellemeler onaylanmis sayilir. -1: sadece sonuncuyu getirir.</param>
    /// <param name="timeoutSeconds">Long polling suresi; 0 ise hemen doner.</param>
    Task<IReadOnlyList<TelegramUpdate>> GetUpdatesAsync(long? offset, int timeoutSeconds, CancellationToken cancellationToken = default);

    Task SendMessageAsync(long chatId, string text, IReadOnlyList<TelegramButton>? buttons = null, CancellationToken cancellationToken = default);

    /// <summary>Buton tiklamasini onaylar (Telegram'daki donen "yukleniyor" simgesini kaldirir).</summary>
    Task AnswerCallbackAsync(string callbackId, CancellationToken cancellationToken = default);
}

/// <summary>Gelen mesaj (Text dolu) ya da buton tiklamasi (CallbackId/CallbackData dolu).</summary>
public record TelegramUpdate(long UpdateId, long ChatId, string? Text, string? CallbackId, string? CallbackData);

/// <summary>Mesajin altindaki satir ici (inline) buton. Data en fazla 64 bayt olabilir.</summary>
public record TelegramButton(string Text, string Data);

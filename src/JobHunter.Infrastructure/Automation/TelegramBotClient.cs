using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using JobHunter.Application.Automation.Telegram;

namespace JobHunter.Infrastructure.Automation;

/// <summary>
/// Telegram Bot API (https://api.telegram.org/bot&lt;token&gt;/metod) istemcisi. Token URL yolunda tasinir
/// (Telegram'in tasarimi), bu yuzden: HttpClient loglari kapatilir (DependencyInjection) ve hata mesajlarina
/// asla istek adresi yazilmaz.
/// </summary>
public class TelegramBotClient : ITelegramGateway
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _httpClient;
    private readonly string _token;

    public TelegramBotClient(HttpClient httpClient, TelegramOptions options)
    {
        _httpClient = httpClient;
        _token = options.BotToken ?? throw new InvalidOperationException("Telegram:BotToken yapilandirilmamis.");
    }

    public async Task<IReadOnlyList<TelegramUpdate>> GetUpdatesAsync(long? offset, int timeoutSeconds, CancellationToken cancellationToken = default)
    {
        var result = await CallAsync("getUpdates", new
        {
            offset,
            timeout = timeoutSeconds,
            allowed_updates = new[] { "message", "callback_query" },
        }, cancellationToken);

        var updates = new List<TelegramUpdate>();
        foreach (var u in result.EnumerateArray())
        {
            var updateId = u.GetProperty("update_id").GetInt64();

            if (u.TryGetProperty("message", out var message) && message.TryGetProperty("chat", out var chat))
            {
                var text = message.TryGetProperty("text", out var t) ? t.GetString() : null;
                updates.Add(new TelegramUpdate(updateId, chat.GetProperty("id").GetInt64(), text, null, null));
            }
            else if (u.TryGetProperty("callback_query", out var callback)
                     && callback.TryGetProperty("message", out var cbMessage)
                     && cbMessage.TryGetProperty("chat", out var cbChat))
            {
                var data = callback.TryGetProperty("data", out var d) ? d.GetString() : null;
                updates.Add(new TelegramUpdate(updateId, cbChat.GetProperty("id").GetInt64(), null, callback.GetProperty("id").GetString(), data));
            }
            else
            {
                // Desteklenmeyen guncelleme turu: yine de offset ilerlesin diye bos bir kayit olarak don.
                updates.Add(new TelegramUpdate(updateId, 0, null, null, null));
            }
        }

        return updates;
    }

    public async Task SendMessageAsync(long chatId, string text, IReadOnlyList<TelegramButton>? buttons = null, CancellationToken cancellationToken = default)
    {
        object? replyMarkup = buttons is { Count: > 0 }
            ? new { inline_keyboard = buttons.Select(b => new[] { new { text = b.Text, callback_data = b.Data } }).ToArray() }
            : null;

        await CallAsync("sendMessage", new
        {
            chat_id = chatId,
            text = text.Length > 4000 ? text[..4000] : text,
            reply_markup = replyMarkup,
        }, cancellationToken);
    }

    public async Task AnswerCallbackAsync(string callbackId, CancellationToken cancellationToken = default)
        => await CallAsync("answerCallbackQuery", new { callback_query_id = callbackId }, cancellationToken);

    private async Task<JsonElement> CallAsync(string method, object body, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.PostAsJsonAsync(
            $"https://api.telegram.org/bot{_token}/{method}", body, JsonOptions, cancellationToken);

        // Hata mesajinda adres/token bulunmaz: sadece metod adi ve Telegram'in aciklamasi.
        var json = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions, cancellationToken);
        var ok = json.TryGetProperty("ok", out var okProp) && okProp.ValueKind == JsonValueKind.True;
        if (!ok)
        {
            var description = json.TryGetProperty("description", out var d) ? d.GetString() : response.StatusCode.ToString();
            throw new HttpRequestException($"Telegram {method} basarisiz: {description}", null, response.StatusCode);
        }

        return json.TryGetProperty("result", out var result) ? result : default;
    }
}

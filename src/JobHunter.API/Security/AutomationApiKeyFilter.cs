using System.Security.Cryptography;
using System.Text;
using JobHunter.Application.Automation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace JobHunter.API.Security;

/// <summary>
/// n8n → backend istekleri icin kimlik dogrulama. n8n bir kullanici olmadigi icin JWT almaz;
/// her istekte "X-Automation-Key: {Automation:ApiKey}" header'i gonderir.
///
///  - Anahtar ayarlanmamissa 503: callback'ler yanlislikla herkese acik kalmasin.
///  - Anahtar yanlis/eksikse 401.
///  - Karsilastirma sabit surelidir (FixedTimeEquals): yanit suresinden anahtarin
///    kac karakterinin dogru oldugu tahmin edilemez (timing attack).
/// Kullanim: controller'a [ServiceFilter(typeof(AutomationApiKeyFilter))].
/// </summary>
public class AutomationApiKeyFilter : IAuthorizationFilter
{
    private readonly AutomationOptions _options;

    public AutomationApiKeyFilter(AutomationOptions options)
    {
        _options = options;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            context.Result = new ObjectResult(new { message = "Otomasyon API anahtari (Automation:ApiKey) yapilandirilmamis." })
            {
                StatusCode = StatusCodes.Status503ServiceUnavailable
            };
            return;
        }

        var provided = context.HttpContext.Request.Headers[AutomationCallbackPaths.HeaderName].ToString();
        var expectedBytes = Encoding.UTF8.GetBytes(_options.ApiKey);
        var providedBytes = Encoding.UTF8.GetBytes(provided);

        if (providedBytes.Length != expectedBytes.Length
            || !CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes))
        {
            context.Result = new UnauthorizedObjectResult(new { message = $"Gecersiz veya eksik {AutomationCallbackPaths.HeaderName} header'i." });
        }
    }
}

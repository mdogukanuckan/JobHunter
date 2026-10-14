namespace JobHunter.Application.Automation;

/// <summary>
/// n8n'in cagirdigi (API anahtariyla korunan) endpoint yollari. Controller route'lari ve
/// veri paketindeki linkler ayni sabitleri kullanir, boylece biri degisirse digeri de degisir.
/// </summary>
public static class AutomationCallbackPaths
{
    public const string Base = "api/automation/n8n/jobs";
    public const string HeaderName = "X-Automation-Key";

    public static string Payload(Guid jobId) => $"/{Base}/{jobId}/payload";
    public static string Cv(Guid jobId) => $"/{Base}/{jobId}/cv";
    public static string Status(Guid jobId) => $"/{Base}/{jobId}/status";
    public static string Events(Guid jobId) => $"/{Base}/{jobId}/events";

    // Faz 11: onay ekrani
    public static string Review(Guid jobId) => $"/{Base}/{jobId}/review";
    public static string Screenshot(Guid jobId) => $"/{Base}/{jobId}/screenshot";
    public static string ApprovalAnswers(Guid jobId) => $"/{Base}/{jobId}/approval-answers";

    // Faz 10b: kural tabanli motorun cozemedigi alanlar icin Claude API'ye toplu danisma.
    public static string SuggestFieldMapping(Guid jobId) => $"/{Base}/{jobId}/suggest-field-mapping";
}

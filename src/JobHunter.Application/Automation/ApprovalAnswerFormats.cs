using System.Globalization;

namespace JobHunter.Application.Automation;

/// <summary>
/// Cevabin yazildigi bicim ile form alaninin bekledigi bicim ayni olmayabilir. Ornegin kullanici tarihi
/// "24.06.1998" yazar ama &lt;input type="date"&gt; sadece "1998-06-24" kabul eder; worker fill'de hata alip
/// alani sessizce bos birakirdi. Bu sinif kabul edilen yazimlari alanin bekledigi bicime cevirir.
/// </summary>
public static class ApprovalAnswerFormats
{
    public const string DateFieldType = "date";
    public const string DateHint = "GG.AA.YYYY (örn. 24.06.1998)";

    private static readonly string[] DateFormats =
    {
        "dd.MM.yyyy", "d.M.yyyy", "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "yyyy-MM-dd",
    };

    /// <summary>Gecerli bir tarihi ISO (yyyy-MM-dd) bicimine cevirir; gecersizse false.</summary>
    public static bool TryNormalizeDate(string input, out string iso)
    {
        if (DateTime.TryParseExact(input.Trim(), DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            iso = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            return true;
        }

        iso = "";
        return false;
    }
}

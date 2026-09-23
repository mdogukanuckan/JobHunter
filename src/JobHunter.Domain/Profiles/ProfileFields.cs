using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Profiles;

/// <summary>
/// Otomasyon politikasi (AutofillPolicy) atanabilen profil alanlarinin anahtarlari ve varsayilan politikalari.
/// Kullanici sadece degistirmek istediklerini kaydeder (ProfileFieldPolicy); kaydi olmayan alan varsayilani kullanir.
///
/// Not: TC kimlik numarasi BILINCLI OLARAK sistemde tutulmaz. Isteyen bir form cikarsa
/// otomasyon insan onayi adiminda (Faz 11) kullanicidan o an ister.
/// </summary>
public static class ProfileFields
{
    public const string DateOfBirth = "DateOfBirth";
    public const string Gender = "Gender";
    public const string MaritalStatus = "MaritalStatus";
    public const string Nationality = "Nationality";
    public const string MilitaryService = "MilitaryService";
    public const string DriverLicense = "DriverLicense";
    public const string Address = "Address";
    public const string Travel = "Travel";
    public const string Smoking = "Smoking";
    public const string Disability = "Disability";
    public const string ExpectedSalary = "ExpectedSalary";
    public const string References = "References";

    /// <summary>
    /// Varsayilanlar: formlarda standart olan ve hassas olmayanlar Auto;
    /// kisisel/stratejik olanlar AskFirst; saglikla ilgili olan Never.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, AutofillPolicy> Defaults = new Dictionary<string, AutofillPolicy>
    {
        [DateOfBirth] = AutofillPolicy.Auto,
        [Gender] = AutofillPolicy.AskFirst,
        [MaritalStatus] = AutofillPolicy.AskFirst,
        [Nationality] = AutofillPolicy.Auto,
        [MilitaryService] = AutofillPolicy.Auto,
        [DriverLicense] = AutofillPolicy.Auto,
        [Address] = AutofillPolicy.Auto,
        [Travel] = AutofillPolicy.Auto,
        [Smoking] = AutofillPolicy.AskFirst,
        [Disability] = AutofillPolicy.Never,
        [ExpectedSalary] = AutofillPolicy.AskFirst,   // Maas ilana gore degisebilir
        [References] = AutofillPolicy.AskFirst,       // Ucuncu kisilerin iletisim bilgileri
    };

    /// <summary>Turkiye surucu belgesi siniflari (2016 sonrasi sistem), resmi siralamasiyla.</summary>
    public static readonly IReadOnlyList<string> DriverLicenseClasses =
    [
        "M", "A1", "A2", "A", "B1", "B", "BE", "C1", "C1E", "C", "CE", "D1", "D1E", "D", "DE", "F", "G"
    ];
}

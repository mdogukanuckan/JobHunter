using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Adayin basvuru formlarinda istenen bilgilerinin "tek dogru kaynagi".
/// Her kullanicinin en fazla bir profili vardir (User 1-1 CandidateProfile).
/// Ad-soyad ve e-posta User uzerinde tutulur; burada tekrar edilmez.
/// Otomasyon (Faz 10) formlari doldururken bu veriyi kullanacak.
/// </summary>
public class CandidateProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // ----- Iletisim / kimlik -----
    public string? Headline { get; set; }          // Guncel unvan, orn. "Backend Developer (.NET)"
    public string? Summary { get; set; }           // Kisa ozgecmis / "hakkimda" metni
    public string? PhoneNumber { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? GitHubUrl { get; set; }
    public string? PortfolioUrl { get; set; }

    // ----- Adres (City/Country yukarida) -----
    public string? District { get; set; }          // Ilce
    public string? AddressLine { get; set; }       // Acik adres
    public string? PostalCode { get; set; }

    // ----- Kisisel bilgiler -----
    // bool? alanlarda null = "belirtilmedi" (formda bos birakilir / otomasyon sorar).
    public DateOnly? DateOfBirth { get; set; }
    public Gender? Gender { get; set; }
    public MaritalStatus? MaritalStatus { get; set; }
    public string? Nationality { get; set; }       // Uyruk, orn. "T.C."
    public MilitaryServiceStatus? MilitaryServiceStatus { get; set; }
    public DateOnly? MilitaryPostponedUntil { get; set; }  // Sadece Postponed (tecilli) iken dolu

    /// <summary>Surucu belgesi siniflari, orn. ["B"]. text[] kolonu.</summary>
    public List<string> DriverLicenseClasses { get; set; } = new();
    public int? DriverLicenseYear { get; set; }    // Ehliyetin alindigi yil

    public bool? CanTravel { get; set; }           // Seyahat engeli yok
    public bool? IsSmoker { get; set; }
    public bool? HasDisability { get; set; }

    // ----- Formlarda sik sorulan tercihler -----
    public int? YearsOfExperience { get; set; }
    public decimal? ExpectedSalary { get; set; }
    public string? SalaryCurrency { get; set; }    // ISO 4217: TRY, EUR, USD...
    public int? NoticePeriodDays { get; set; }     // Ihbar suresi
    public WorkMode? PreferredWorkMode { get; set; }
    public bool OpenToRelocation { get; set; }
    public bool RequiresVisaSponsorship { get; set; }
    public string? WorkAuthorization { get; set; } // Serbest metin, orn. "TR vatandasi; AB calisma izni yok"

    /// <summary>Yetenekler. PostgreSQL'de text[] (dizi) kolonu olarak saklanir; ayri tablo gerekmez.</summary>
    public List<string> Skills { get; set; } = new();

    /// <summary>Basvurularda varsayilan olarak kullanilacak CV. Silinmis (soft delete) CV olamaz.</summary>
    public Guid? DefaultCvId { get; set; }
    public Cv? DefaultCv { get; set; }

    public ICollection<WorkExperience> WorkExperiences { get; set; } = new List<WorkExperience>();
    public ICollection<Education> Educations { get; set; } = new List<Education>();
    public ICollection<ProfileLanguage> Languages { get; set; } = new List<ProfileLanguage>();
    public ICollection<ScreeningAnswer> ScreeningAnswers { get; set; } = new List<ScreeningAnswer>();
    public ICollection<Certificate> Certificates { get; set; } = new List<Certificate>();
    public ICollection<ProfileReference> References { get; set; } = new List<ProfileReference>();
    public ICollection<ProfileCustomField> CustomFields { get; set; } = new List<ProfileCustomField>();

    /// <summary>Varsayilandan farkli secilmis otomasyon politikalari (bkz. ProfileFields.Defaults).</summary>
    public ICollection<ProfileFieldPolicy> FieldPolicies { get; set; } = new List<ProfileFieldPolicy>();
}

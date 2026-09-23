using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Profiles.Dtos;

/// <summary>
/// Profilin ana alanlari. PUT semantigi: gonderilmeyen (null) alan temizlenir.
/// Profil yoksa olusturulur, varsa guncellenir (upsert).
/// Alt listeler (deneyim, egitim, dil, hazir cevap, sertifika, referans, ek bilgi) kendi endpoint'lerinden yonetilir.
/// TC kimlik no bilincli olarak yok (bkz. ProfileFields).
/// </summary>
public record UpsertProfileRequest(
    [MaxLength(200)] string? Headline,
    string? Summary,
    [MaxLength(30), Phone] string? PhoneNumber,
    [MaxLength(100)] string? City,
    [MaxLength(100)] string? Country,
    [MaxLength(500), Url] string? LinkedInUrl,
    [MaxLength(500), Url] string? GitHubUrl,
    [MaxLength(500), Url] string? PortfolioUrl,
    [Range(0, 60)] int? YearsOfExperience,
    [Range(typeof(decimal), "0", "9999999999")] decimal? ExpectedSalary,
    [RegularExpression("^[A-Za-z]{3}$", ErrorMessage = "Para birimi 3 harfli ISO kodu olmali (TRY, EUR, USD...).")] string? SalaryCurrency,
    [Range(0, 365)] int? NoticePeriodDays,
    WorkMode? PreferredWorkMode,
    bool OpenToRelocation,
    bool RequiresVisaSponsorship,
    [MaxLength(500)] string? WorkAuthorization,
    List<string>? Skills,
    Guid? DefaultCvId,
    // ----- Faz 5b: adres ve kisisel bilgiler -----
    [MaxLength(100)] string? District = null,
    [MaxLength(500)] string? AddressLine = null,
    [MaxLength(20)] string? PostalCode = null,
    DateOnly? DateOfBirth = null,
    Gender? Gender = null,
    MaritalStatus? MaritalStatus = null,
    [MaxLength(100)] string? Nationality = null,
    MilitaryServiceStatus? MilitaryServiceStatus = null,
    DateOnly? MilitaryPostponedUntil = null,
    List<string>? DriverLicenseClasses = null,
    [Range(1950, 2100)] int? DriverLicenseYear = null,
    bool? CanTravel = null,
    bool? IsSmoker = null,
    bool? HasDisability = null);

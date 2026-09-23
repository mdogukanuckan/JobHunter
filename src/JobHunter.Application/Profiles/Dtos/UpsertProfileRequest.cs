using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Profiles.Dtos;

/// <summary>
/// Profilin ana alanlari. PUT semantigi: gonderilmeyen (null) alan temizlenir.
/// Profil yoksa olusturulur, varsa guncellenir (upsert).
/// Alt listeler (deneyim, egitim, dil, hazir cevap) kendi endpoint'lerinden yonetilir.
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
    Guid? DefaultCvId);

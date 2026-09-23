using JobHunter.Domain.Enums;

namespace JobHunter.Application.Profiles.Dtos;

/// <summary>Profilin tamami: ana alanlar + tum alt listeler. FullName/Email User tablosundan gelir.</summary>
public record ProfileResponse(
    Guid Id,
    string FullName,
    string Email,
    string? Headline,
    string? Summary,
    string? PhoneNumber,
    string? City,
    string? Country,
    string? LinkedInUrl,
    string? GitHubUrl,
    string? PortfolioUrl,
    int? YearsOfExperience,
    decimal? ExpectedSalary,
    string? SalaryCurrency,
    int? NoticePeriodDays,
    WorkMode? PreferredWorkMode,
    bool OpenToRelocation,
    bool RequiresVisaSponsorship,
    string? WorkAuthorization,
    IReadOnlyList<string> Skills,
    Guid? DefaultCvId,
    string? DefaultCvName,
    IReadOnlyList<WorkExperienceResponse> WorkExperiences,
    IReadOnlyList<EducationResponse> Educations,
    IReadOnlyList<LanguageResponse> Languages,
    IReadOnlyList<ScreeningAnswerResponse> ScreeningAnswers,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

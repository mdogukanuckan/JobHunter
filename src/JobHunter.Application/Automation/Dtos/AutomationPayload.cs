using JobHunter.Domain.Enums;

namespace JobHunter.Application.Automation.Dtos;

/// <summary>
/// Otomasyonun (n8n + Claude) bir basvuru formunu doldurmak icin ihtiyac duydugu her sey, tek JSON'da.
///
/// Gizlilik kurali (Faz 5b politikalari):
///  - Hassas alanlar "PolicyFields" altinda { policy, value } olarak gelir.
///      Auto     → deger var, sormadan doldurulabilir
///      AskFirst → deger var ama once kullaniciya sorulmali (Faz 11 onay adimi)
///      Never    → deger HIC gonderilmez (null); form zorunlu tutuyorsa is onaya dusmeli
///  - Politikasi Never olan ek bilgiler (CustomFields) pakete hic girmez.
///  - TC kimlik no sistemde yoktur; form isterse onay adiminda kullanicidan istenir.
/// </summary>
public record AutomationPayload(
    AutomationPayloadJob Job,
    AutomationPayloadApplication Application,
    AutomationPayloadCandidate Candidate,
    IReadOnlyDictionary<string, AutomationPolicyField> PolicyFields,
    IReadOnlyList<AutomationPayloadExperience> WorkExperiences,
    IReadOnlyList<AutomationPayloadEducation> Educations,
    IReadOnlyList<AutomationPayloadLanguage> Languages,
    IReadOnlyList<AutomationPayloadCertificate> Certificates,
    IReadOnlyList<AutomationPayloadScreeningAnswer> ScreeningAnswers,
    IReadOnlyList<AutomationPayloadCustomField> CustomFields,
    AutomationPayloadCv? Cv,
    // Otomasyonun bilmesi gereken eksikler, orn. "CV secilmemis", "Profil olusturulmamis".
    IReadOnlyList<string> Warnings);

public record AutomationPayloadJob(Guid Id, int AttemptNumber, AutomationMode Mode, AutomationJobStatus Status);

public record AutomationPayloadApplication(
    Guid Id,
    string CompanyName,
    string JobTitle,
    string? JobUrl,
    string? Location,
    string? Source,
    string? JobDescription);

/// <summary>Hassas olmayan, her formda istenen temel bilgiler (politikasiz).</summary>
public record AutomationPayloadCandidate(
    string FullName,
    string? FirstName,
    string? LastName,
    string Email,
    string? PhoneNumber,
    string? Headline,
    string? Summary,
    string? City,
    string? Country,
    string? LinkedInUrl,
    string? GitHubUrl,
    string? PortfolioUrl,
    int? YearsOfExperience,
    int? NoticePeriodDays,
    WorkMode? PreferredWorkMode,
    bool OpenToRelocation,
    bool RequiresVisaSponsorship,
    string? WorkAuthorization,
    IReadOnlyList<string> Skills);

/// <summary>Politikali alan. Value'nun tipi alana gore degisir (tarih, metin, nesne, liste); Never ise her zaman null.</summary>
public record AutomationPolicyField(AutofillPolicy Policy, object? Value);

// PolicyFields icindeki birlesik degerler
public record AutomationAddressValue(string? AddressLine, string? District, string? City, string? PostalCode, string? Country);
public record AutomationMilitaryValue(MilitaryServiceStatus Status, DateOnly? PostponedUntil);
public record AutomationDriverLicenseValue(IReadOnlyList<string> Classes, int? Year);
public record AutomationSalaryValue(decimal Amount, string? Currency);
public record AutomationReferenceValue(string FullName, string? Company, string? Title, string? Relationship, string? PhoneNumber, string? Email);

public record AutomationPayloadExperience(string CompanyName, string Title, string? Location, DateOnly StartDate, DateOnly? EndDate, bool IsCurrent, string? Description);
public record AutomationPayloadEducation(string School, string? FieldOfStudy, EducationDegree Degree, DateOnly? StartDate, DateOnly? EndDate, string? Gpa);
public record AutomationPayloadLanguage(string Name, LanguageLevel Level);
public record AutomationPayloadCertificate(string Name, string? Issuer, DateOnly? IssueDate, DateOnly? ExpiryDate, string? CredentialId, string? CredentialUrl);
public record AutomationPayloadScreeningAnswer(string Question, string Answer, IReadOnlyList<string> Tags);
public record AutomationPayloadCustomField(string Label, string Value, AutofillPolicy Policy);

/// <summary>CV dosyasi. DownloadUrl'e X-Automation-Key header'iyla GET atilarak indirilir.</summary>
public record AutomationPayloadCv(Guid Id, string Name, string FileName, string ContentType, long SizeBytes, string DownloadUrl);

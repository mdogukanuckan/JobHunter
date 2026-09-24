using JobHunter.Application.Automation.Dtos;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using JobHunter.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Automation.Services;

public class AutomationPayloadBuilder : IAutomationPayloadBuilder
{
    private readonly IApplicationDbContext _context;
    private readonly AutomationOptions _options;

    public AutomationPayloadBuilder(IApplicationDbContext context, AutomationOptions options)
    {
        _context = context;
        _options = options;
    }

    public async Task<AutomationPayload> BuildAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        var job = await _context.AutomationJobs
            .AsNoTracking()
            .Include(j => j.JobApplication).ThenInclude(a => a.User)
            .Include(j => j.Cv)
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken)
            ?? throw new KeyNotFoundException("Otomasyon isi bulunamadi.");

        var application = job.JobApplication;
        var user = application.User;

        // Profilin tum alt listeleri; AsSplitQuery ile her koleksiyon ayri SELECT (kartezyen patlama olmaz).
        var profile = await _context.CandidateProfiles
            .AsNoTracking()
            .AsSplitQuery()
            .Include(p => p.WorkExperiences)
            .Include(p => p.Educations)
            .Include(p => p.Languages)
            .Include(p => p.ScreeningAnswers)
            .Include(p => p.Certificates)
            .Include(p => p.References)
            .Include(p => p.CustomFields)
            .Include(p => p.FieldPolicies)
            .FirstOrDefaultAsync(p => p.UserId == user.Id, cancellationToken);

        var warnings = new List<string>();
        if (profile is null) warnings.Add("Aday profili olusturulmamis; sadece ad ve e-posta var.");
        if (job.Cv is null) warnings.Add("Bu denemeye CV secilmemis (basvuruda da profilde de varsayilan CV yok).");
        else if (job.Cv.IsDeleted) warnings.Add("Secilen CV sonradan silinmis (dosya hala indirilebilir).");
        if (string.IsNullOrWhiteSpace(application.JobUrl)) warnings.Add("Basvurunun ilan linki (JobUrl) bos.");

        var (firstName, lastName) = SplitName(user.FullName);

        var candidate = new AutomationPayloadCandidate(
            user.FullName, firstName, lastName, user.Email,
            profile?.PhoneNumber, profile?.Headline, profile?.Summary,
            profile?.City, profile?.Country,
            profile?.LinkedInUrl, profile?.GitHubUrl, profile?.PortfolioUrl,
            profile?.YearsOfExperience, profile?.NoticePeriodDays, profile?.PreferredWorkMode,
            profile?.OpenToRelocation ?? false, profile?.RequiresVisaSponsorship ?? false,
            profile?.WorkAuthorization,
            profile?.Skills ?? []);

        return new AutomationPayload(
            new AutomationPayloadJob(job.Id, job.AttemptNumber, job.Mode, job.Status),
            new AutomationPayloadApplication(
                application.Id, application.CompanyName, application.JobTitle, application.JobUrl,
                application.Location, application.Source, application.JobDescription),
            candidate,
            BuildPolicyFields(profile),
            profile is null ? [] : profile.WorkExperiences
                .OrderByDescending(x => x.IsCurrent)
                .ThenByDescending(x => x.EndDate ?? DateOnly.MaxValue)
                .ThenByDescending(x => x.StartDate)
                .Select(x => new AutomationPayloadExperience(x.CompanyName, x.Title, x.Location, x.StartDate, x.EndDate, x.IsCurrent, x.Description))
                .ToList(),
            profile is null ? [] : profile.Educations
                .OrderByDescending(x => x.EndDate ?? DateOnly.MaxValue)
                .Select(x => new AutomationPayloadEducation(x.School, x.FieldOfStudy, x.Degree, x.StartDate, x.EndDate, x.Gpa))
                .ToList(),
            profile is null ? [] : profile.Languages
                .OrderBy(x => x.Name)
                .Select(x => new AutomationPayloadLanguage(x.Name, x.Level))
                .ToList(),
            profile is null ? [] : profile.Certificates
                .OrderByDescending(x => x.IssueDate ?? DateOnly.MinValue)
                .Select(x => new AutomationPayloadCertificate(x.Name, x.Issuer, x.IssueDate, x.ExpiryDate, x.CredentialId, x.CredentialUrl))
                .ToList(),
            profile is null ? [] : profile.ScreeningAnswers
                .OrderBy(x => x.CreatedAt)
                .Select(x => new AutomationPayloadScreeningAnswer(x.Question, x.Answer, x.Tags))
                .ToList(),
            // Never olan ek bilgiler pakete HIC girmez.
            profile is null ? [] : profile.CustomFields
                .Where(x => x.Policy != AutofillPolicy.Never)
                .OrderBy(x => x.Label)
                .Select(x => new AutomationPayloadCustomField(x.Label, x.Value, x.Policy))
                .ToList(),
            job.Cv is null ? null : new AutomationPayloadCv(
                job.Cv.Id, job.Cv.Name, job.Cv.OriginalFileName, job.Cv.ContentType, job.Cv.SizeBytes,
                _options.BuildUrl(AutomationCallbackPaths.Cv(job.Id))),
            warnings);
    }

    /// <summary>
    /// Politikali alanlar: her biri { policy, value }. Never ise deger ASLA pakete konmaz.
    /// Deger bos (kullanici girmemis) ise value null gelir; otomasyon bunu "bilinmiyor" diye yorumlar.
    /// </summary>
    private static Dictionary<string, AutomationPolicyField> BuildPolicyFields(CandidateProfile? p)
    {
        // Gecerli politikalar: varsayilanlar + kullanicinin degistirdikleri.
        var policies = new Dictionary<string, AutofillPolicy>(ProfileFields.Defaults);
        if (p is not null)
        {
            foreach (var o in p.FieldPolicies)
                if (policies.ContainsKey(o.FieldKey)) policies[o.FieldKey] = o.Policy;
        }

        var values = new Dictionary<string, object?>
        {
            [ProfileFields.DateOfBirth] = p?.DateOfBirth,
            [ProfileFields.Gender] = p?.Gender,
            [ProfileFields.MaritalStatus] = p?.MaritalStatus,
            [ProfileFields.Nationality] = p?.Nationality,
            [ProfileFields.MilitaryService] = p?.MilitaryServiceStatus is { } ms
                ? new AutomationMilitaryValue(ms, p.MilitaryPostponedUntil)
                : null,
            [ProfileFields.DriverLicense] = p is { DriverLicenseClasses.Count: > 0 }
                ? new AutomationDriverLicenseValue(p.DriverLicenseClasses, p.DriverLicenseYear)
                : null,
            [ProfileFields.Address] = p is not null && (p.AddressLine ?? p.District ?? p.PostalCode) is not null
                ? new AutomationAddressValue(p.AddressLine, p.District, p.City, p.PostalCode, p.Country)
                : null,
            [ProfileFields.Travel] = p?.CanTravel,
            [ProfileFields.Smoking] = p?.IsSmoker,
            [ProfileFields.Disability] = p?.HasDisability,
            [ProfileFields.ExpectedSalary] = p?.ExpectedSalary is { } salary
                ? new AutomationSalaryValue(salary, p.SalaryCurrency)
                : null,
            [ProfileFields.References] = p is { References.Count: > 0 }
                ? p.References.OrderBy(r => r.CreatedAt)
                    .Select(r => new AutomationReferenceValue(r.FullName, r.Company, r.Title, r.Relationship, r.PhoneNumber, r.Email))
                    .ToList()
                : null,
        };

        return policies.ToDictionary(
            kv => kv.Key,
            kv => new AutomationPolicyField(
                kv.Value,
                kv.Value == AutofillPolicy.Never ? null : values.GetValueOrDefault(kv.Key)));
    }

    /// <summary>"Mehmet Dogukan Uckan" → ("Mehmet Dogukan", "Uckan"). Formlarda ad/soyad ayri istenir.</summary>
    private static (string? First, string? Last) SplitName(string fullName)
    {
        var trimmed = fullName.Trim();
        var i = trimmed.LastIndexOf(' ');
        return i <= 0 ? (trimmed.Length == 0 ? null : trimmed, null) : (trimmed[..i].Trim(), trimmed[(i + 1)..]);
    }
}

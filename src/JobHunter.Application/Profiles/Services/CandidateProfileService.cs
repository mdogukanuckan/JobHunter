using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Profiles.Dtos;
using JobHunter.Application.Profiles.Exceptions;
using JobHunter.Application.Profiles.Interfaces;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using JobHunter.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Profiles.Services;

/// <summary>
/// Aday profili servisi. Dosya buyudugu icin partial class olarak bolundu:
/// bu dosya ana profil + deneyim/egitim/dil/hazir cevap; CandidateProfileService.Extras.cs
/// sertifika, referans, ek bilgi ve otomasyon politikalari (Faz 5b).
/// </summary>
public partial class CandidateProfileService : ICandidateProfileService
{
    private const int MaxSkills = 100;
    private const int MaxSkillLength = 100;
    private const int MaxTags = 20;
    private const int MaxTagLength = 50;

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CandidateProfileService(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    // =====================================================================
    // Ana profil
    // =====================================================================

    public async Task<ProfileResponse> GetAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        // 4 koleksiyonu tek JOIN'le cekmek satirlari carpar (deneyim x egitim x dil x cevap = "kartezyen patlama").
        // AsSplitQuery her koleksiyon icin ayri bir SELECT atar; toplam veri cok daha az olur.
        var profile = await _context.CandidateProfiles
            .AsNoTracking()
            .AsSplitQuery()
            .Include(p => p.User)
            .Include(p => p.DefaultCv)
            .Include(p => p.WorkExperiences)
            .Include(p => p.Educations)
            .Include(p => p.Languages)
            .Include(p => p.ScreeningAnswers)
            .Include(p => p.Certificates)
            .Include(p => p.References)
            .Include(p => p.CustomFields)
            .Include(p => p.FieldPolicies)
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Profil henuz olusturulmamis.");

        return ToResponse(profile);
    }

    public async Task<ProfileResponse> UpsertAsync(UpsertProfileRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        if (request.ExpectedSalary is not null && string.IsNullOrWhiteSpace(request.SalaryCurrency))
            throw new ProfileValidationException("Maas beklentisi icin para birimi (SalaryCurrency) gerekli.");

        ValidatePersonalDetails(request);

        if (request.DefaultCvId is { } cvId)
        {
            var cvIsUsable = await _context.Cvs.AnyAsync(
                cv => cv.Id == cvId && cv.UserId == userId && !cv.IsDeleted, cancellationToken);
            if (!cvIsUsable)
                throw new ProfileValidationException("Varsayilan CV bulunamadi veya silinmis.");
        }

        var profile = await _context.CandidateProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (profile is null)
        {
            profile = new CandidateProfile { UserId = userId };
            _context.CandidateProfiles.Add(profile);
        }
        else
        {
            profile.UpdatedAt = DateTime.UtcNow;
        }

        profile.Headline = Clean(request.Headline);
        profile.Summary = Clean(request.Summary);
        profile.PhoneNumber = Clean(request.PhoneNumber);
        profile.City = Clean(request.City);
        profile.Country = Clean(request.Country);
        profile.LinkedInUrl = Clean(request.LinkedInUrl);
        profile.GitHubUrl = Clean(request.GitHubUrl);
        profile.PortfolioUrl = Clean(request.PortfolioUrl);
        profile.YearsOfExperience = request.YearsOfExperience;
        profile.ExpectedSalary = request.ExpectedSalary;
        profile.SalaryCurrency = Clean(request.SalaryCurrency)?.ToUpperInvariant();
        profile.NoticePeriodDays = request.NoticePeriodDays;
        profile.PreferredWorkMode = request.PreferredWorkMode;
        profile.OpenToRelocation = request.OpenToRelocation;
        profile.RequiresVisaSponsorship = request.RequiresVisaSponsorship;
        profile.WorkAuthorization = Clean(request.WorkAuthorization);
        profile.Skills = NormalizeList(request.Skills, MaxSkills, MaxSkillLength, "yetenek");
        profile.DefaultCvId = request.DefaultCvId;

        // ----- Faz 5b -----
        profile.District = Clean(request.District);
        profile.AddressLine = Clean(request.AddressLine);
        profile.PostalCode = Clean(request.PostalCode);
        profile.DateOfBirth = request.DateOfBirth;
        profile.Gender = request.Gender;
        profile.MaritalStatus = request.MaritalStatus;
        profile.Nationality = Clean(request.Nationality);
        profile.MilitaryServiceStatus = request.MilitaryServiceStatus;
        // Tecil tarihi sadece "tecilli" durumunda anlamli; baska durumda eski deger kalmasin.
        profile.MilitaryPostponedUntil = request.MilitaryServiceStatus == MilitaryServiceStatus.Postponed
            ? request.MilitaryPostponedUntil
            : null;
        profile.DriverLicenseClasses = NormalizeDriverLicenseClasses(request.DriverLicenseClasses);
        // Ehliyet sinifi yoksa ehliyet yili da anlamsiz.
        profile.DriverLicenseYear = profile.DriverLicenseClasses.Count > 0 ? request.DriverLicenseYear : null;
        profile.CanTravel = request.CanTravel;
        profile.IsSmoker = request.IsSmoker;
        profile.HasDisability = request.HasDisability;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetAsync(cancellationToken);
    }

    // =====================================================================
    // Is deneyimleri
    // =====================================================================

    public async Task<WorkExperienceResponse> AddWorkExperienceAsync(WorkExperienceRequest request, CancellationToken cancellationToken = default)
    {
        ValidateExperienceDates(request);
        var profileId = await GetOrCreateProfileIdAsync(cancellationToken);

        var entity = new WorkExperience { CandidateProfileId = profileId };
        Apply(entity, request);

        _context.WorkExperiences.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task<WorkExperienceResponse> UpdateWorkExperienceAsync(Guid id, WorkExperienceRequest request, CancellationToken cancellationToken = default)
    {
        ValidateExperienceDates(request);
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.WorkExperiences
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Is deneyimi bulunamadi.");

        Apply(entity, request);
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteWorkExperienceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.WorkExperiences
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Is deneyimi bulunamadi.");

        _context.WorkExperiences.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // =====================================================================
    // Egitim
    // =====================================================================

    public async Task<EducationResponse> AddEducationAsync(EducationRequest request, CancellationToken cancellationToken = default)
    {
        ValidateRange(request.StartDate, request.EndDate);
        var profileId = await GetOrCreateProfileIdAsync(cancellationToken);

        var entity = new Education { CandidateProfileId = profileId };
        Apply(entity, request);

        _context.Educations.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task<EducationResponse> UpdateEducationAsync(Guid id, EducationRequest request, CancellationToken cancellationToken = default)
    {
        ValidateRange(request.StartDate, request.EndDate);
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.Educations
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Egitim kaydi bulunamadi.");

        Apply(entity, request);
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteEducationAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.Educations
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Egitim kaydi bulunamadi.");

        _context.Educations.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // =====================================================================
    // Diller
    // =====================================================================

    public async Task<LanguageResponse> AddLanguageAsync(LanguageRequest request, CancellationToken cancellationToken = default)
    {
        var profileId = await GetOrCreateProfileIdAsync(cancellationToken);
        var name = request.Name.Trim();
        await EnsureLanguageIsUniqueAsync(profileId, name, excludeId: null, cancellationToken);

        var entity = new ProfileLanguage { CandidateProfileId = profileId, Name = name, Level = request.Level };

        _context.ProfileLanguages.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task<LanguageResponse> UpdateLanguageAsync(Guid id, LanguageRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.ProfileLanguages
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Dil kaydi bulunamadi.");

        var name = request.Name.Trim();
        await EnsureLanguageIsUniqueAsync(entity.CandidateProfileId, name, excludeId: entity.Id, cancellationToken);

        entity.Name = name;
        entity.Level = request.Level;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteLanguageAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.ProfileLanguages
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Dil kaydi bulunamadi.");

        _context.ProfileLanguages.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // =====================================================================
    // Hazir cevap bankasi
    // =====================================================================

    public async Task<ScreeningAnswerResponse> AddScreeningAnswerAsync(ScreeningAnswerRequest request, CancellationToken cancellationToken = default)
    {
        var profileId = await GetOrCreateProfileIdAsync(cancellationToken);

        var entity = new ScreeningAnswer { CandidateProfileId = profileId };
        Apply(entity, request);

        _context.ScreeningAnswers.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task<ScreeningAnswerResponse> UpdateScreeningAnswerAsync(Guid id, ScreeningAnswerRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.ScreeningAnswers
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Hazir cevap bulunamadi.");

        Apply(entity, request);
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteScreeningAnswerAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.ScreeningAnswers
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Hazir cevap bulunamadi.");

        _context.ScreeningAnswers.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // =====================================================================
    // Yardimci metotlar
    // =====================================================================

    /// <summary>
    /// Alt kayit eklerken profilin var olmasi gerekir. Kullaniciyi "once profil olustur" adimina zorlamamak icin
    /// profil yoksa bos bir tane olusturulur. Not: alt kayitlarin sahiplik kontrolu
    /// "x.CandidateProfile.UserId == userId" ile yapilir; baskasinin kaydi 404 doner.
    /// </summary>
    private async Task<Guid> GetOrCreateProfileIdAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();

        var profileId = await _context.CandidateProfiles
            .Where(p => p.UserId == userId)
            .Select(p => (Guid?)p.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (profileId is { } existing)
            return existing;

        var profile = new CandidateProfile { UserId = userId };
        _context.CandidateProfiles.Add(profile);
        await _context.SaveChangesAsync(cancellationToken);
        return profile.Id;
    }

    private async Task EnsureLanguageIsUniqueAsync(Guid profileId, string name, Guid? excludeId, CancellationToken cancellationToken)
    {
        var lowered = name.ToLower();
        var exists = await _context.ProfileLanguages.AnyAsync(
            l => l.CandidateProfileId == profileId && l.Name.ToLower() == lowered && l.Id != excludeId,
            cancellationToken);

        if (exists)
            throw new ProfileValidationException($"'{name}' dili profilde zaten var.");
    }

    private static void ValidateExperienceDates(WorkExperienceRequest request)
    {
        if (request.IsCurrent && request.EndDate is not null)
            throw new ProfileValidationException("Halen devam eden bir is icin bitis tarihi girilmemeli.");

        if (!request.IsCurrent && request.EndDate is null)
            throw new ProfileValidationException("Bitis tarihi girin veya 'halen calisiyorum' (IsCurrent) secin.");

        ValidateRange(request.StartDate, request.EndDate);
    }

    private static void ValidateRange(DateOnly? start, DateOnly? end)
    {
        if (start is not null && end is not null && end < start)
            throw new ProfileValidationException("Bitis tarihi baslangic tarihinden once olamaz.");
    }

    /// <summary>Bosluklari kirpar; bos string'i null'a cevirir (DB'de "" ve NULL karisikligi olmasin).</summary>
    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Etiket/yetenek listesi: kirp, boslari at, buyuk/kucuk harf duyarsiz tekrarlari kaldir, sinirla.</summary>
    private static List<string> NormalizeList(IEnumerable<string>? items, int maxItems, int maxLength, string label)
    {
        var result = (items ?? Enumerable.Empty<string>())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (result.Count > maxItems)
            throw new ProfileValidationException($"En fazla {maxItems} {label} eklenebilir.");

        if (result.Any(s => s.Length > maxLength))
            throw new ProfileValidationException($"Her {label} en fazla {maxLength} karakter olabilir.");

        return result;
    }

    private static void Apply(WorkExperience e, WorkExperienceRequest r)
    {
        e.CompanyName = r.CompanyName.Trim();
        e.Title = r.Title.Trim();
        e.Location = Clean(r.Location);
        e.StartDate = r.StartDate;
        e.EndDate = r.EndDate;
        e.IsCurrent = r.IsCurrent;
        e.Description = Clean(r.Description);
    }

    private static void Apply(Education e, EducationRequest r)
    {
        e.School = r.School.Trim();
        e.FieldOfStudy = Clean(r.FieldOfStudy);
        e.Degree = r.Degree;
        e.StartDate = r.StartDate;
        e.EndDate = r.EndDate;
        e.Gpa = Clean(r.Gpa);
        e.Description = Clean(r.Description);
    }

    private static void Apply(ScreeningAnswer e, ScreeningAnswerRequest r)
    {
        e.Question = r.Question.Trim();
        e.Answer = r.Answer.Trim();
        e.Tags = NormalizeList(r.Tags, MaxTags, MaxTagLength, "etiket");
    }

    // ----- Entity -> DTO -----

    private static ProfileResponse ToResponse(CandidateProfile p) => new(
        p.Id,
        p.User.FullName,
        p.User.Email,
        p.Headline,
        p.Summary,
        p.PhoneNumber,
        p.City,
        p.Country,
        p.District,
        p.AddressLine,
        p.PostalCode,
        p.DateOfBirth,
        p.Gender,
        p.MaritalStatus,
        p.Nationality,
        p.MilitaryServiceStatus,
        p.MilitaryPostponedUntil,
        p.DriverLicenseClasses,
        p.DriverLicenseYear,
        p.CanTravel,
        p.IsSmoker,
        p.HasDisability,
        p.LinkedInUrl,
        p.GitHubUrl,
        p.PortfolioUrl,
        p.YearsOfExperience,
        p.ExpectedSalary,
        p.SalaryCurrency,
        p.NoticePeriodDays,
        p.PreferredWorkMode,
        p.OpenToRelocation,
        p.RequiresVisaSponsorship,
        p.WorkAuthorization,
        p.Skills,
        p.DefaultCvId,
        p.DefaultCv?.Name,
        // Ozgecmis sirasi: devam eden is en ustte, sonra en yeniden eskiye.
        p.WorkExperiences
            .OrderByDescending(x => x.IsCurrent)
            .ThenByDescending(x => x.EndDate ?? DateOnly.MaxValue)
            .ThenByDescending(x => x.StartDate)
            .Select(ToResponse).ToList(),
        p.Educations
            .OrderByDescending(x => x.EndDate ?? DateOnly.MaxValue)
            .ThenByDescending(x => x.StartDate)
            .Select(ToResponse).ToList(),
        p.Languages.OrderBy(x => x.Name).Select(ToResponse).ToList(),
        p.ScreeningAnswers.OrderBy(x => x.CreatedAt).Select(ToResponse).ToList(),
        p.Certificates
            .OrderByDescending(x => x.IssueDate ?? DateOnly.MinValue)
            .Select(ToResponse).ToList(),
        p.References.OrderBy(x => x.CreatedAt).Select(ToResponse).ToList(),
        p.CustomFields.OrderBy(x => x.Label).Select(ToResponse).ToList(),
        EffectivePolicies(p.FieldPolicies),
        p.CreatedAt,
        p.UpdatedAt);

    private static WorkExperienceResponse ToResponse(WorkExperience x) => new(
        x.Id, x.CompanyName, x.Title, x.Location, x.StartDate, x.EndDate, x.IsCurrent, x.Description);

    private static EducationResponse ToResponse(Education x) => new(
        x.Id, x.School, x.FieldOfStudy, x.Degree, x.StartDate, x.EndDate, x.Gpa, x.Description);

    private static LanguageResponse ToResponse(ProfileLanguage x) => new(x.Id, x.Name, x.Level);

    private static ScreeningAnswerResponse ToResponse(ScreeningAnswer x) => new(x.Id, x.Question, x.Answer, x.Tags);
}

using JobHunter.Application.Profiles.Dtos;

namespace JobHunter.Application.Profiles.Interfaces;

/// <summary>
/// Giris yapmis kullanicinin aday profili. Tum islemler sadece kullanicinin kendi profiline uygulanir.
/// Alt kayit ekleme islemleri, profil yoksa once bos bir profil olusturur.
/// </summary>
public interface ICandidateProfileService
{
    /// <summary>Profil yoksa KeyNotFoundException.</summary>
    Task<ProfileResponse> GetAsync(CancellationToken cancellationToken = default);
    Task<ProfileResponse> UpsertAsync(UpsertProfileRequest request, CancellationToken cancellationToken = default);

    Task<WorkExperienceResponse> AddWorkExperienceAsync(WorkExperienceRequest request, CancellationToken cancellationToken = default);
    Task<WorkExperienceResponse> UpdateWorkExperienceAsync(Guid id, WorkExperienceRequest request, CancellationToken cancellationToken = default);
    Task DeleteWorkExperienceAsync(Guid id, CancellationToken cancellationToken = default);

    Task<EducationResponse> AddEducationAsync(EducationRequest request, CancellationToken cancellationToken = default);
    Task<EducationResponse> UpdateEducationAsync(Guid id, EducationRequest request, CancellationToken cancellationToken = default);
    Task DeleteEducationAsync(Guid id, CancellationToken cancellationToken = default);

    Task<LanguageResponse> AddLanguageAsync(LanguageRequest request, CancellationToken cancellationToken = default);
    Task<LanguageResponse> UpdateLanguageAsync(Guid id, LanguageRequest request, CancellationToken cancellationToken = default);
    Task DeleteLanguageAsync(Guid id, CancellationToken cancellationToken = default);

    Task<ScreeningAnswerResponse> AddScreeningAnswerAsync(ScreeningAnswerRequest request, CancellationToken cancellationToken = default);
    Task<ScreeningAnswerResponse> UpdateScreeningAnswerAsync(Guid id, ScreeningAnswerRequest request, CancellationToken cancellationToken = default);
    Task DeleteScreeningAnswerAsync(Guid id, CancellationToken cancellationToken = default);
}

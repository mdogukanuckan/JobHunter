using JobHunter.Application.Profiles.Dtos;
using JobHunter.Domain.Enums;

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

    Task<CertificateResponse> AddCertificateAsync(CertificateRequest request, CancellationToken cancellationToken = default);
    Task<CertificateResponse> UpdateCertificateAsync(Guid id, CertificateRequest request, CancellationToken cancellationToken = default);
    Task DeleteCertificateAsync(Guid id, CancellationToken cancellationToken = default);

    Task<ReferenceResponse> AddReferenceAsync(ReferenceRequest request, CancellationToken cancellationToken = default);
    Task<ReferenceResponse> UpdateReferenceAsync(Guid id, ReferenceRequest request, CancellationToken cancellationToken = default);
    Task DeleteReferenceAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CustomFieldResponse> AddCustomFieldAsync(CustomFieldRequest request, CancellationToken cancellationToken = default);
    Task<CustomFieldResponse> UpdateCustomFieldAsync(Guid id, CustomFieldRequest request, CancellationToken cancellationToken = default);
    Task DeleteCustomFieldAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Sadece gonderilen alanlarin politikasini degistirir; tum alanlarin gecerli politikasini doner.</summary>
    Task<IReadOnlyDictionary<string, AutofillPolicy>> UpdateFieldPoliciesAsync(UpdateFieldPoliciesRequest request, CancellationToken cancellationToken = default);
}

using JobHunter.Application.Profiles.Dtos;
using JobHunter.Application.Profiles.Exceptions;
using JobHunter.Application.Profiles.Interfaces;
using JobHunter.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobHunter.API.Controllers;

/// <summary>
/// Giris yapmis kullanicinin aday profili. Route'ta kullanici Id'si yok: profil her zaman JWT'deki kullaniciya aittir.
/// Alt listeler (deneyim, egitim, dil, hazir cevap) ayri alt kaynaklar olarak yonetilir.
/// </summary>
[ApiController]
[Authorize]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
    private readonly ICandidateProfileService _service;

    public ProfileController(ICandidateProfileService service)
    {
        _service = service;
    }

    // ---------- Ana profil ----------

    [HttpGet]
    public Task<ActionResult<ProfileResponse>> Get(CancellationToken ct)
        => Handle(() => _service.GetAsync(ct));

    /// <summary>Upsert: profil yoksa olusturur, varsa ana alanlari gunceller.</summary>
    [HttpPut]
    public Task<ActionResult<ProfileResponse>> Upsert(UpsertProfileRequest request, CancellationToken ct)
        => Handle(() => _service.UpsertAsync(request, ct));

    // ---------- Is deneyimleri ----------

    [HttpPost("experiences")]
    public Task<ActionResult<WorkExperienceResponse>> AddExperience(WorkExperienceRequest request, CancellationToken ct)
        => Handle(() => _service.AddWorkExperienceAsync(request, ct), created: true);

    [HttpPut("experiences/{id:guid}")]
    public Task<ActionResult<WorkExperienceResponse>> UpdateExperience(Guid id, WorkExperienceRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateWorkExperienceAsync(id, request, ct));

    [HttpDelete("experiences/{id:guid}")]
    public Task<IActionResult> DeleteExperience(Guid id, CancellationToken ct)
        => HandleDelete(() => _service.DeleteWorkExperienceAsync(id, ct));

    // ---------- Egitim ----------

    [HttpPost("educations")]
    public Task<ActionResult<EducationResponse>> AddEducation(EducationRequest request, CancellationToken ct)
        => Handle(() => _service.AddEducationAsync(request, ct), created: true);

    [HttpPut("educations/{id:guid}")]
    public Task<ActionResult<EducationResponse>> UpdateEducation(Guid id, EducationRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateEducationAsync(id, request, ct));

    [HttpDelete("educations/{id:guid}")]
    public Task<IActionResult> DeleteEducation(Guid id, CancellationToken ct)
        => HandleDelete(() => _service.DeleteEducationAsync(id, ct));

    // ---------- Diller ----------

    [HttpPost("languages")]
    public Task<ActionResult<LanguageResponse>> AddLanguage(LanguageRequest request, CancellationToken ct)
        => Handle(() => _service.AddLanguageAsync(request, ct), created: true);

    [HttpPut("languages/{id:guid}")]
    public Task<ActionResult<LanguageResponse>> UpdateLanguage(Guid id, LanguageRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateLanguageAsync(id, request, ct));

    [HttpDelete("languages/{id:guid}")]
    public Task<IActionResult> DeleteLanguage(Guid id, CancellationToken ct)
        => HandleDelete(() => _service.DeleteLanguageAsync(id, ct));

    // ---------- Hazir cevap bankasi ----------

    [HttpPost("screening-answers")]
    public Task<ActionResult<ScreeningAnswerResponse>> AddScreeningAnswer(ScreeningAnswerRequest request, CancellationToken ct)
        => Handle(() => _service.AddScreeningAnswerAsync(request, ct), created: true);

    [HttpPut("screening-answers/{id:guid}")]
    public Task<ActionResult<ScreeningAnswerResponse>> UpdateScreeningAnswer(Guid id, ScreeningAnswerRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateScreeningAnswerAsync(id, request, ct));

    [HttpDelete("screening-answers/{id:guid}")]
    public Task<IActionResult> DeleteScreeningAnswer(Guid id, CancellationToken ct)
        => HandleDelete(() => _service.DeleteScreeningAnswerAsync(id, ct));

    // ---------- Sertifikalar ----------

    [HttpPost("certificates")]
    public Task<ActionResult<CertificateResponse>> AddCertificate(CertificateRequest request, CancellationToken ct)
        => Handle(() => _service.AddCertificateAsync(request, ct), created: true);

    [HttpPut("certificates/{id:guid}")]
    public Task<ActionResult<CertificateResponse>> UpdateCertificate(Guid id, CertificateRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateCertificateAsync(id, request, ct));

    [HttpDelete("certificates/{id:guid}")]
    public Task<IActionResult> DeleteCertificate(Guid id, CancellationToken ct)
        => HandleDelete(() => _service.DeleteCertificateAsync(id, ct));

    // ---------- Referanslar ----------

    [HttpPost("references")]
    public Task<ActionResult<ReferenceResponse>> AddReference(ReferenceRequest request, CancellationToken ct)
        => Handle(() => _service.AddReferenceAsync(request, ct), created: true);

    [HttpPut("references/{id:guid}")]
    public Task<ActionResult<ReferenceResponse>> UpdateReference(Guid id, ReferenceRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateReferenceAsync(id, request, ct));

    [HttpDelete("references/{id:guid}")]
    public Task<IActionResult> DeleteReference(Guid id, CancellationToken ct)
        => HandleDelete(() => _service.DeleteReferenceAsync(id, ct));

    // ---------- Ek bilgiler ----------

    [HttpPost("custom-fields")]
    public Task<ActionResult<CustomFieldResponse>> AddCustomField(CustomFieldRequest request, CancellationToken ct)
        => Handle(() => _service.AddCustomFieldAsync(request, ct), created: true);

    [HttpPut("custom-fields/{id:guid}")]
    public Task<ActionResult<CustomFieldResponse>> UpdateCustomField(Guid id, CustomFieldRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateCustomFieldAsync(id, request, ct));

    [HttpDelete("custom-fields/{id:guid}")]
    public Task<IActionResult> DeleteCustomField(Guid id, CancellationToken ct)
        => HandleDelete(() => _service.DeleteCustomFieldAsync(id, ct));

    // ---------- Otomasyon politikalari ----------

    /// <summary>Kismi guncelleme: { "policies": { "Gender": "Never" } } sadece Gender'i degistirir.</summary>
    [HttpPut("field-policies")]
    public Task<ActionResult<IReadOnlyDictionary<string, AutofillPolicy>>> UpdateFieldPolicies(UpdateFieldPoliciesRequest request, CancellationToken ct)
        => Handle(() => _service.UpdateFieldPoliciesAsync(request, ct));

    // ---------- Ortak hata cevirisi ----------
    // 14 endpoint'te ayni try/catch'i tekrarlamamak icin tek yerde toplandi:
    // KeyNotFoundException -> 404, ProfileValidationException -> 400.
    // (Ileride tum controller'lar icin global exception middleware'e tasinabilir.)

    private async Task<ActionResult<T>> Handle<T>(Func<Task<T>> action, bool created = false)
    {
        try
        {
            var result = await action();
            // Alt kayitlarin tek basina GET endpoint'i yok; olusan kayit GET /api/profile icinde gorunur.
            return created ? StatusCode(StatusCodes.Status201Created, result) : Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ProfileValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private async Task<IActionResult> HandleDelete(Func<Task> action)
    {
        try
        {
            await action();
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

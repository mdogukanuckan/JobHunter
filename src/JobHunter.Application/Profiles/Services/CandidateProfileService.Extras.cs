using JobHunter.Application.Profiles.Dtos;
using JobHunter.Application.Profiles.Exceptions;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using JobHunter.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Profiles.Services;

/// <summary>
/// Faz 5b: sertifikalar, referanslar, ek bilgiler (etiket-deger) ve otomasyon politikalari.
/// Ana profil ve diger alt listeler CandidateProfileService.cs dosyasinda.
/// </summary>
public partial class CandidateProfileService
{
    private const int MinAge = 14;
    private const int MaxAge = 100;

    // =====================================================================
    // Sertifikalar
    // =====================================================================

    public async Task<CertificateResponse> AddCertificateAsync(CertificateRequest request, CancellationToken cancellationToken = default)
    {
        ValidateRange(request.IssueDate, request.ExpiryDate);
        var profileId = await GetOrCreateProfileIdAsync(cancellationToken);

        var entity = new Certificate { CandidateProfileId = profileId };
        Apply(entity, request);

        _context.Certificates.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task<CertificateResponse> UpdateCertificateAsync(Guid id, CertificateRequest request, CancellationToken cancellationToken = default)
    {
        ValidateRange(request.IssueDate, request.ExpiryDate);
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.Certificates
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Sertifika bulunamadi.");

        Apply(entity, request);
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteCertificateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.Certificates
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Sertifika bulunamadi.");

        _context.Certificates.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // =====================================================================
    // Referanslar
    // =====================================================================

    public async Task<ReferenceResponse> AddReferenceAsync(ReferenceRequest request, CancellationToken cancellationToken = default)
    {
        var profileId = await GetOrCreateProfileIdAsync(cancellationToken);

        var entity = new ProfileReference { CandidateProfileId = profileId };
        Apply(entity, request);

        _context.ProfileReferences.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task<ReferenceResponse> UpdateReferenceAsync(Guid id, ReferenceRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.ProfileReferences
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Referans bulunamadi.");

        Apply(entity, request);
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteReferenceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.ProfileReferences
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Referans bulunamadi.");

        _context.ProfileReferences.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // =====================================================================
    // Ek bilgiler (etiket-deger)
    // =====================================================================

    public async Task<CustomFieldResponse> AddCustomFieldAsync(CustomFieldRequest request, CancellationToken cancellationToken = default)
    {
        EnsureValidPolicy(request.Policy);
        var profileId = await GetOrCreateProfileIdAsync(cancellationToken);
        var label = request.Label.Trim();
        await EnsureCustomFieldLabelIsUniqueAsync(profileId, label, excludeId: null, cancellationToken);

        var entity = new ProfileCustomField
        {
            CandidateProfileId = profileId,
            Label = label,
            Value = request.Value.Trim(),
            Policy = request.Policy
        };

        _context.ProfileCustomFields.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task<CustomFieldResponse> UpdateCustomFieldAsync(Guid id, CustomFieldRequest request, CancellationToken cancellationToken = default)
    {
        EnsureValidPolicy(request.Policy);
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.ProfileCustomFields
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Ek bilgi bulunamadi.");

        var label = request.Label.Trim();
        await EnsureCustomFieldLabelIsUniqueAsync(entity.CandidateProfileId, label, excludeId: entity.Id, cancellationToken);

        entity.Label = label;
        entity.Value = request.Value.Trim();
        entity.Policy = request.Policy;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteCustomFieldAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var entity = await _context.ProfileCustomFields
            .FirstOrDefaultAsync(x => x.Id == id && x.CandidateProfile.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Ek bilgi bulunamadi.");

        _context.ProfileCustomFields.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // =====================================================================
    // Otomasyon politikalari
    // =====================================================================

    public async Task<IReadOnlyDictionary<string, AutofillPolicy>> UpdateFieldPoliciesAsync(
        UpdateFieldPoliciesRequest request, CancellationToken cancellationToken = default)
    {
        // Anahtarlari dogrula ve kanonik yaziya cevir ("gender" -> "Gender").
        var changes = new Dictionary<string, AutofillPolicy>();
        foreach (var (rawKey, policy) in request.Policies)
        {
            var key = ProfileFields.Defaults.Keys.FirstOrDefault(k => string.Equals(k, rawKey, StringComparison.OrdinalIgnoreCase))
                      ?? throw new ProfileValidationException($"'{rawKey}' icin otomasyon politikasi tanimlanamaz.");
            EnsureValidPolicy(policy);
            changes[key] = policy;
        }

        var profileId = await GetOrCreateProfileIdAsync(cancellationToken);
        var existing = await _context.ProfileFieldPolicies
            .Where(x => x.CandidateProfileId == profileId)
            .ToListAsync(cancellationToken);

        foreach (var (key, policy) in changes)
        {
            var row = existing.FirstOrDefault(x => x.FieldKey == key);
            var isDefault = ProfileFields.Defaults[key] == policy;

            // Sadece varsayilandan farkli secimler saklanir: varsayilana donulurse satir silinir.
            // Boylece ileride bir varsayilani degistirirsek, hic dokunulmamis alanlar yeni varsayilani alir.
            if (isDefault)
            {
                if (row is not null)
                {
                    _context.ProfileFieldPolicies.Remove(row);
                    existing.Remove(row);
                }
            }
            else if (row is null)
            {
                row = new ProfileFieldPolicy { CandidateProfileId = profileId, FieldKey = key, Policy = policy };
                _context.ProfileFieldPolicies.Add(row);
                existing.Add(row);
            }
            else
            {
                row.Policy = policy;
                row.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return EffectivePolicies(existing);
    }

    // =====================================================================
    // Yardimci metotlar (Faz 5b)
    // =====================================================================

    private static void ValidatePersonalDetails(UpsertProfileRequest request)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (request.DateOfBirth is { } dob)
        {
            if (dob > today.AddYears(-MinAge) || dob < today.AddYears(-MaxAge))
                throw new ProfileValidationException("Dogum tarihi gecerli degil.");
        }

        if (request.DriverLicenseYear is { } year && year > today.Year)
            throw new ProfileValidationException("Ehliyet yili gelecekte olamaz.");

        if (request.MilitaryServiceStatus == MilitaryServiceStatus.Postponed
            && request.MilitaryPostponedUntil is { } until && until < today)
            throw new ProfileValidationException("Tecil bitis tarihi gecmiste; askerlik durumunu guncelleyin.");

        EnsureDefined(request.Gender);
        EnsureDefined(request.MaritalStatus);
        EnsureDefined(request.MilitaryServiceStatus);
    }

    /// <summary>Ehliyet siniflari: kirp, buyuk harfe cevir, tekrarlari at, gecerlilik kontrolu yap, resmi siraya diz.</summary>
    private static List<string> NormalizeDriverLicenseClasses(IEnumerable<string>? classes)
    {
        var normalized = (classes ?? Enumerable.Empty<string>())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim().ToUpperInvariant())
            .Distinct()
            .ToList();

        var invalid = normalized.Where(c => !ProfileFields.DriverLicenseClasses.Contains(c)).ToList();
        if (invalid.Count > 0)
            throw new ProfileValidationException($"Gecersiz ehliyet sinifi: {string.Join(", ", invalid)}");

        return ProfileFields.DriverLicenseClasses.Where(normalized.Contains).ToList();
    }

    private async Task EnsureCustomFieldLabelIsUniqueAsync(Guid profileId, string label, Guid? excludeId, CancellationToken cancellationToken)
    {
        var lowered = label.ToLower();
        var exists = await _context.ProfileCustomFields.AnyAsync(
            x => x.CandidateProfileId == profileId && x.Label.ToLower() == lowered && x.Id != excludeId,
            cancellationToken);

        if (exists)
            throw new ProfileValidationException($"'{label}' etiketli bir ek bilgi zaten var.");
    }

    /// <summary>JSON'da sayi olarak gelen tanimsiz enum degerlerini (orn. 99) reddeder.</summary>
    private static void EnsureValidPolicy(AutofillPolicy policy)
    {
        if (!Enum.IsDefined(policy))
            throw new ProfileValidationException("Gecersiz otomasyon politikasi.");
    }

    private static void EnsureDefined<TEnum>(TEnum? value) where TEnum : struct, Enum
    {
        if (value is { } v && !Enum.IsDefined(v))
            throw new ProfileValidationException("Gecersiz secim degeri.");
    }

    /// <summary>Varsayilanlarin uzerine kullanicinin secimlerini yazar; her politikali alan icin tek bir deger doner.</summary>
    private static IReadOnlyDictionary<string, AutofillPolicy> EffectivePolicies(IEnumerable<ProfileFieldPolicy> overrides)
    {
        var result = new Dictionary<string, AutofillPolicy>(ProfileFields.Defaults);
        foreach (var o in overrides)
        {
            if (result.ContainsKey(o.FieldKey)) result[o.FieldKey] = o.Policy;
        }
        return result;
    }

    private static void Apply(Certificate e, CertificateRequest r)
    {
        e.Name = r.Name.Trim();
        e.Issuer = Clean(r.Issuer);
        e.IssueDate = r.IssueDate;
        e.ExpiryDate = r.ExpiryDate;
        e.CredentialId = Clean(r.CredentialId);
        e.CredentialUrl = Clean(r.CredentialUrl);
    }

    private static void Apply(ProfileReference e, ReferenceRequest r)
    {
        e.FullName = r.FullName.Trim();
        e.Company = Clean(r.Company);
        e.Title = Clean(r.Title);
        e.Relationship = Clean(r.Relationship);
        e.PhoneNumber = Clean(r.PhoneNumber);
        e.Email = Clean(r.Email)?.ToLowerInvariant();
        e.Notes = Clean(r.Notes);
    }

    private static CertificateResponse ToResponse(Certificate x) => new(
        x.Id, x.Name, x.Issuer, x.IssueDate, x.ExpiryDate, x.CredentialId, x.CredentialUrl);

    private static ReferenceResponse ToResponse(ProfileReference x) => new(
        x.Id, x.FullName, x.Company, x.Title, x.Relationship, x.PhoneNumber, x.Email, x.Notes);

    private static CustomFieldResponse ToResponse(ProfileCustomField x) => new(x.Id, x.Label, x.Value, x.Policy);
}

using JobHunter.Application.Automation.Dtos;

namespace JobHunter.Application.Automation.Interfaces;

/// <summary>
/// Faz 10b: worker'in kural tabanli motorda (mapping.ts) cozemedigi alanlar icin Claude API'ye
/// TOPLU (form basina tek istek) danisir. Sahiplik kontrolu YAPMAZ; cagiran taraf (API anahtarli
/// callback) isin erisilebilir oldugundan emin olmalidir. Is bulunamazsa KeyNotFoundException.
/// </summary>
public interface IFieldMappingService
{
    Task<SuggestFieldMappingResponse> SuggestAsync(Guid jobId, SuggestFieldMappingRequest request, CancellationToken cancellationToken = default);
}

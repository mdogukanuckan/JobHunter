using JobHunter.Application.JobApplications.Dtos;

namespace JobHunter.Application.JobApplications.Interfaces;

/// <summary>
/// Kanban basvuru islemleri. Tum metotlar sadece giris yapmis kullanicinin kayitlari uzerinde calisir;
/// baskasina ait ya da olmayan bir kayit istenirse KeyNotFoundException firlatilir.
/// </summary>
public interface IJobApplicationService
{
    Task<IReadOnlyList<JobApplicationSummaryResponse>> GetBoardAsync(CancellationToken cancellationToken = default);
    Task<JobApplicationDetailResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<JobApplicationDetailResponse> CreateAsync(CreateJobApplicationRequest request, CancellationToken cancellationToken = default);
    Task<JobApplicationDetailResponse> UpdateAsync(Guid id, UpdateJobApplicationRequest request, CancellationToken cancellationToken = default);
    Task<JobApplicationSummaryResponse> MoveAsync(Guid id, MoveJobApplicationRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

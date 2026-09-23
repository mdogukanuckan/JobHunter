using JobHunter.Application.Interviews.Dtos;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Interviews.Interfaces;

/// <summary>Giris yapmis kullanicinin basvurularina ait mulakatlar.</summary>
public interface IInterviewService
{
    /// <summary>Filtreli liste, ScheduledAt'e gore artan sirali. Tum filtreler opsiyonel.</summary>
    Task<IReadOnlyList<InterviewResponse>> GetAllAsync(
        DateTimeOffset? from, DateTimeOffset? to, Guid? jobApplicationId, InterviewOutcome? outcome,
        CancellationToken cancellationToken = default);

    /// <summary>Simdiden itibaren 'days' gun icindeki, sonucu bekleyen mulakatlar (1-90 arasi).</summary>
    Task<IReadOnlyList<InterviewResponse>> GetUpcomingAsync(int days, CancellationToken cancellationToken = default);

    Task<InterviewResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<InterviewResponse> CreateAsync(CreateInterviewRequest request, CancellationToken cancellationToken = default);
    Task<InterviewResponse> UpdateAsync(Guid id, UpdateInterviewRequest request, CancellationToken cancellationToken = default);
    Task<InterviewResponse> SetOutcomeAsync(Guid id, SetInterviewOutcomeRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

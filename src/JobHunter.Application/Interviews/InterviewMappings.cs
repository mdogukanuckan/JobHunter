using JobHunter.Application.Interviews.Dtos;
using JobHunter.Domain.Entities;

namespace JobHunter.Application.Interviews;

/// <summary>Entity -> DTO donusumu. InterviewService ve JobApplicationService (detay) ortak kullanir.</summary>
internal static class InterviewMappings
{
    /// <remarks>i.JobApplication yuklenmis olmali (Include veya EF'in navigation fix-up'i ile).</remarks>
    public static InterviewResponse ToResponse(Interview i) => new(
        i.Id,
        i.JobApplicationId,
        i.JobApplication.CompanyName,
        i.JobApplication.JobTitle,
        i.JobApplication.Status,
        i.ScheduledAt,
        i.DurationMinutes,
        i.Type,
        i.Format,
        i.Location,
        i.MeetingUrl,
        i.Interviewers,
        i.PreparationNotes,
        i.FeedbackNotes,
        i.Outcome,
        i.CreatedAt,
        i.UpdatedAt);
}

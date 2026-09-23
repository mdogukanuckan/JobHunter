using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Interviews.Dtos;
using JobHunter.Application.Interviews.Interfaces;
using JobHunter.Application.JobApplications.Dtos;
using JobHunter.Application.JobApplications.Interfaces;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Interviews.Services;

public class InterviewService : IInterviewService
{
    private const int MaxUpcomingDays = 90;

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IJobApplicationService _jobApplications;

    public InterviewService(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IJobApplicationService jobApplications)
    {
        _context = context;
        _currentUser = currentUser;
        _jobApplications = jobApplications;
    }

    public async Task<IReadOnlyList<InterviewResponse>> GetAllAsync(
        DateTimeOffset? from, DateTimeOffset? to, Guid? jobApplicationId, InterviewOutcome? outcome,
        CancellationToken cancellationToken = default)
    {
        var query = OwnedInterviews().AsNoTracking();

        if (from is { } f) query = query.Where(i => i.ScheduledAt >= f.UtcDateTime);
        if (to is { } t) query = query.Where(i => i.ScheduledAt < t.UtcDateTime);
        if (jobApplicationId is { } appId) query = query.Where(i => i.JobApplicationId == appId);
        if (outcome is { } o) query = query.Where(i => i.Outcome == o);

        var items = await query.OrderBy(i => i.ScheduledAt).ToListAsync(cancellationToken);
        return items.Select(InterviewMappings.ToResponse).ToList();
    }

    public async Task<IReadOnlyList<InterviewResponse>> GetUpcomingAsync(int days, CancellationToken cancellationToken = default)
    {
        days = Math.Clamp(days, 1, MaxUpcomingDays);
        var now = DateTime.UtcNow;
        var until = now.AddDays(days);

        var items = await OwnedInterviews()
            .AsNoTracking()
            .Where(i => i.Outcome == InterviewOutcome.Pending && i.ScheduledAt >= now && i.ScheduledAt < until)
            .OrderBy(i => i.ScheduledAt)
            .ToListAsync(cancellationToken);

        return items.Select(InterviewMappings.ToResponse).ToList();
    }

    public async Task<InterviewResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => InterviewMappings.ToResponse(await FindOwnedAsync(id, cancellationToken));

    public async Task<InterviewResponse> CreateAsync(CreateInterviewRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        // Govdedeki Id gecersizse 404 degil 400: bulunamayan sey URL'deki kaynak degil, istekteki referans.
        var application = await _context.JobApplications
            .FirstOrDefaultAsync(ja => ja.Id == request.JobApplicationId && ja.UserId == userId, cancellationToken)
            ?? throw new BusinessValidationException("Basvuru bulunamadi.");

        var interview = new Interview
        {
            JobApplicationId = application.Id,
            JobApplication = application,
            ScheduledAt = request.ScheduledAt.UtcDateTime,
            DurationMinutes = request.DurationMinutes,
            Type = request.Type,
            Format = request.Format,
            Location = Clean(request.Location),
            MeetingUrl = Clean(request.MeetingUrl),
            Interviewers = Clean(request.Interviewers),
            PreparationNotes = Clean(request.PreparationNotes)
        };
        _context.Interviews.Add(interview);

        if (application.Status is ApplicationStatus.Wishlist or ApplicationStatus.Applied)
        {
            // Kanban tasima kurallari (sira numaralama, durum gecmisi, AppliedAt) tek yerde, JobApplicationService'te.
            // MoveAsync ayni DbContext'i kullandigi icin kendi SaveChanges'i yeni mulakati da kaydeder:
            // mulakat + kart tasima tek transaction'da gerceklesir (biri basarisizsa ikisi de olmaz).
            await _jobApplications.MoveAsync(
                application.Id,
                new MoveJobApplicationRequest(ApplicationStatus.Interview, int.MaxValue), // int.MaxValue = sutunun en alti
                cancellationToken);
        }
        else
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return InterviewMappings.ToResponse(interview);
    }

    public async Task<InterviewResponse> UpdateAsync(Guid id, UpdateInterviewRequest request, CancellationToken cancellationToken = default)
    {
        var interview = await FindOwnedAsync(id, cancellationToken);

        interview.ScheduledAt = request.ScheduledAt.UtcDateTime;
        interview.DurationMinutes = request.DurationMinutes;
        interview.Type = request.Type;
        interview.Format = request.Format;
        interview.Location = Clean(request.Location);
        interview.MeetingUrl = Clean(request.MeetingUrl);
        interview.Interviewers = Clean(request.Interviewers);
        interview.PreparationNotes = Clean(request.PreparationNotes);
        interview.FeedbackNotes = Clean(request.FeedbackNotes);
        interview.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return InterviewMappings.ToResponse(interview);
    }

    public async Task<InterviewResponse> SetOutcomeAsync(Guid id, SetInterviewOutcomeRequest request, CancellationToken cancellationToken = default)
    {
        var interview = await FindOwnedAsync(id, cancellationToken);

        interview.Outcome = request.Outcome;
        if (request.FeedbackNotes is not null)
            interview.FeedbackNotes = Clean(request.FeedbackNotes);
        interview.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return InterviewMappings.ToResponse(interview);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var interview = await FindOwnedAsync(id, cancellationToken);

        // Bagli gorevler silinmez; FK SetNull ile mulakat baglantisi kopar.
        _context.Interviews.Remove(interview);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // ---------- Yardimci metotlar ----------

    /// <summary>Sadece kullanicinin kendi basvurularina ait mulakatlar (sahiplik basvuru uzerinden).</summary>
    private IQueryable<Interview> OwnedInterviews()
    {
        var userId = _currentUser.GetRequiredUserId();
        return _context.Interviews
            .Include(i => i.JobApplication)
            .Where(i => i.JobApplication.UserId == userId);
    }

    private async Task<Interview> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
        => await OwnedInterviews().FirstOrDefaultAsync(i => i.Id == id, cancellationToken)
           ?? throw new KeyNotFoundException("Mulakat bulunamadi.");

    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

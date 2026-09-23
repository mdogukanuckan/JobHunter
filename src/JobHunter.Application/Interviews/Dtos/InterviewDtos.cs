using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Interviews.Dtos;

// Zaman alanlari DateTimeOffset: istemci "2026-10-01T14:00:00+03:00" gibi saat dilimli gonderir,
// servis bunu UTC'ye cevirip saklar. (PostgreSQL timestamptz sadece UTC DateTime kabul eder.)

/// <summary>Yeni mulakat. Basvuru Wishlist/Applied ise kart otomatik olarak Interview sutununa tasinir.</summary>
public record CreateInterviewRequest(
    Guid JobApplicationId,
    DateTimeOffset ScheduledAt,
    [Range(5, 1440)] int? DurationMinutes,
    InterviewType Type,
    InterviewFormat Format,
    [MaxLength(300)] string? Location,
    [MaxLength(2000), Url] string? MeetingUrl,
    [MaxLength(500)] string? Interviewers,
    string? PreparationNotes);

/// <summary>Mulakat bilgilerini gunceller (PUT). Bagli oldugu basvuru degistirilemez.</summary>
public record UpdateInterviewRequest(
    DateTimeOffset ScheduledAt,
    [Range(5, 1440)] int? DurationMinutes,
    InterviewType Type,
    InterviewFormat Format,
    [MaxLength(300)] string? Location,
    [MaxLength(2000), Url] string? MeetingUrl,
    [MaxLength(500)] string? Interviewers,
    string? PreparationNotes,
    string? FeedbackNotes);

/// <summary>Mulakat sonucu. FeedbackNotes verilirse notlar da guncellenir.</summary>
public record SetInterviewOutcomeRequest(
    InterviewOutcome Outcome,
    string? FeedbackNotes);

/// <summary>
/// Mulakat + takvimde gostermek icin basvurunun ozet bilgisi.
/// ApplicationStatus: kartin guncel sutunu (otomatik tasima sonrasi frontend panoyu guncelleyebilsin).
/// </summary>
public record InterviewResponse(
    Guid Id,
    Guid JobApplicationId,
    string CompanyName,
    string JobTitle,
    ApplicationStatus ApplicationStatus,
    DateTime ScheduledAt,
    int? DurationMinutes,
    InterviewType Type,
    InterviewFormat Format,
    string? Location,
    string? MeetingUrl,
    string? Interviewers,
    string? PreparationNotes,
    string? FeedbackNotes,
    InterviewOutcome Outcome,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

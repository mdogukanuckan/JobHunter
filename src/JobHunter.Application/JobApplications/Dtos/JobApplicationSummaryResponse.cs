using JobHunter.Domain.Enums;

namespace JobHunter.Application.JobApplications.Dtos;

/// <summary>Kanban panosundaki kart icin hafif model (uzun ilan metni ve notlar yok).</summary>
public record JobApplicationSummaryResponse(
    Guid Id,
    string CompanyName,
    string JobTitle,
    string? Location,
    string? Source,
    ApplicationStatus Status,
    int Position,
    DateTime? AppliedAt,
    Guid? CvId,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

using JobHunter.Application.Interviews.Dtos;
using JobHunter.Application.Todos.Dtos;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.JobApplications.Dtos;

/// <summary>Kart acildiginda gosterilen tam detay: ilan metni, notlar, durum gecmisi, mulakatlar ve gorevler.</summary>
public record JobApplicationDetailResponse(
    Guid Id,
    string CompanyName,
    string JobTitle,
    string? JobUrl,
    string? Location,
    string? Source,
    string? JobDescription,
    string? Notes,
    ApplicationStatus Status,
    int Position,
    DateTime? AppliedAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    JobApplicationCvResponse? Cv,
    IReadOnlyList<StatusHistoryResponse> StatusHistory,
    IReadOnlyList<InterviewResponse> Interviews,
    IReadOnlyList<TodoResponse> Todos);

/// <summary>Basvuruda kullanilan CV. IsDeleted = true ise CV listeden kaldirilmis ama gecmis icin gosteriliyor.</summary>
public record JobApplicationCvResponse(
    Guid Id,
    string Name,
    bool IsDeleted);

public record StatusHistoryResponse(
    ApplicationStatus? FromStatus,
    ApplicationStatus ToStatus,
    DateTime ChangedAt);

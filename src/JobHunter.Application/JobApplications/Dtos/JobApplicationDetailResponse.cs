using JobHunter.Domain.Enums;

namespace JobHunter.Application.JobApplications.Dtos;

/// <summary>Kart acildiginda gosterilen tam detay: ilan metni, notlar ve durum gecmisi.</summary>
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
    IReadOnlyList<StatusHistoryResponse> StatusHistory);

public record StatusHistoryResponse(
    ApplicationStatus? FromStatus,
    ApplicationStatus ToStatus,
    DateTime ChangedAt);

using System.ComponentModel.DataAnnotations;

namespace JobHunter.Application.Profiles.Dtos;

public record CertificateRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(200)] string? Issuer,
    DateOnly? IssueDate,
    DateOnly? ExpiryDate,
    [MaxLength(200)] string? CredentialId,
    [MaxLength(500), Url] string? CredentialUrl);

public record CertificateResponse(
    Guid Id,
    string Name,
    string? Issuer,
    DateOnly? IssueDate,
    DateOnly? ExpiryDate,
    string? CredentialId,
    string? CredentialUrl);

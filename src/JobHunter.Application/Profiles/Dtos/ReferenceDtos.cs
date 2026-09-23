using System.ComponentModel.DataAnnotations;

namespace JobHunter.Application.Profiles.Dtos;

public record ReferenceRequest(
    [Required, MaxLength(200)] string FullName,
    [MaxLength(200)] string? Company,
    [MaxLength(200)] string? Title,
    [MaxLength(100)] string? Relationship,
    [MaxLength(30), Phone] string? PhoneNumber,
    [MaxLength(254), EmailAddress] string? Email,
    [MaxLength(1000)] string? Notes);

public record ReferenceResponse(
    Guid Id,
    string FullName,
    string? Company,
    string? Title,
    string? Relationship,
    string? PhoneNumber,
    string? Email,
    string? Notes);

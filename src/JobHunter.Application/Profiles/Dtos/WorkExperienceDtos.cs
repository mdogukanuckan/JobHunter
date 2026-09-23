using System.ComponentModel.DataAnnotations;

namespace JobHunter.Application.Profiles.Dtos;

/// <summary>Olusturma ve guncelleme icin ortak istek. Tarih formati: "2024-01-15".</summary>
public record WorkExperienceRequest(
    [Required, MaxLength(200)] string CompanyName,
    [Required, MaxLength(200)] string Title,
    [MaxLength(200)] string? Location,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsCurrent,
    string? Description);

public record WorkExperienceResponse(
    Guid Id,
    string CompanyName,
    string Title,
    string? Location,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsCurrent,
    string? Description);

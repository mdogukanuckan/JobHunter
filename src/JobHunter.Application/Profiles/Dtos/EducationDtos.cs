using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Profiles.Dtos;

public record EducationRequest(
    [Required, MaxLength(200)] string School,
    [MaxLength(200)] string? FieldOfStudy,
    EducationDegree Degree,
    DateOnly? StartDate,
    DateOnly? EndDate,
    [MaxLength(20)] string? Gpa,
    string? Description);

public record EducationResponse(
    Guid Id,
    string School,
    string? FieldOfStudy,
    EducationDegree Degree,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? Gpa,
    string? Description);

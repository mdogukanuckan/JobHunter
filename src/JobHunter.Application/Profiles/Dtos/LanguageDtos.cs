using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Profiles.Dtos;

public record LanguageRequest(
    [Required, MaxLength(50)] string Name,
    LanguageLevel Level);

public record LanguageResponse(Guid Id, string Name, LanguageLevel Level);

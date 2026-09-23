using System.ComponentModel.DataAnnotations;

namespace JobHunter.Application.Profiles.Dtos;

public record ScreeningAnswerRequest(
    [Required, MaxLength(500)] string Question,
    [Required] string Answer,
    List<string>? Tags);

public record ScreeningAnswerResponse(Guid Id, string Question, string Answer, IReadOnlyList<string> Tags);

using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Todos.Dtos;

/// <summary>
/// Olusturma ve guncelleme (PUT) icin ortak istek.
/// JobApplicationId ve InterviewId opsiyonel. Sadece InterviewId verilirse basvuru mulakattan otomatik alinir;
/// ikisi birden verilirse mulakat o basvuruya ait olmalidir.
/// </summary>
public record TodoRequest(
    [Required, MaxLength(300)] string Title,
    string? Description,
    DateTimeOffset? DueAt,
    TodoPriority Priority = TodoPriority.Medium,
    Guid? JobApplicationId = null,
    Guid? InterviewId = null);

/// <summary>Tamamla / geri al.</summary>
public record SetTodoCompletionRequest(bool IsCompleted);

public record TodoResponse(
    Guid Id,
    string Title,
    string? Description,
    DateTime? DueAt,
    TodoPriority Priority,
    bool IsCompleted,
    DateTime? CompletedAt,
    Guid? JobApplicationId,
    string? CompanyName,
    string? JobTitle,
    Guid? InterviewId,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

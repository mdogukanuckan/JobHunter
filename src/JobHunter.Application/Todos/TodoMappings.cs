using JobHunter.Application.Todos.Dtos;
using JobHunter.Domain.Entities;

namespace JobHunter.Application.Todos;

/// <summary>Entity -> DTO ve siralama. TodoService ve JobApplicationService (detay) ortak kullanir.</summary>
internal static class TodoMappings
{
    public static TodoResponse ToResponse(TodoItem t) => new(
        t.Id,
        t.Title,
        t.Description,
        t.DueAt,
        t.Priority,
        t.IsCompleted,
        t.CompletedAt,
        t.JobApplicationId,
        t.JobApplication?.CompanyName,
        t.JobApplication?.JobTitle,
        t.InterviewId,
        t.CreatedAt,
        t.UpdatedAt);

    /// <summary>
    /// Liste sirasi: once acik gorevler; icinde son tarihi yakin olan (tarihsizler en sonda),
    /// sonra yuksek oncelik, sonra eski olan. Bellekte yapilir: Priority DB'de string oldugu icin
    /// SQL'de "High" &lt; "Low" &lt; "Medium" diye alfabetik siralanirdi.
    /// </summary>
    public static IEnumerable<TodoItem> DefaultOrder(IEnumerable<TodoItem> items) => items
        .OrderBy(t => t.IsCompleted)
        .ThenBy(t => t.DueAt is null)
        .ThenBy(t => t.DueAt)
        .ThenByDescending(t => t.Priority)
        .ThenBy(t => t.CreatedAt);
}

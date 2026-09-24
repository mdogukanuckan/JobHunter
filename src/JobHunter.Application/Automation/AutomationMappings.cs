using System.Text.Json;
using JobHunter.Application.Automation.Dtos;
using JobHunter.Domain.Entities;

namespace JobHunter.Application.Automation;

internal static class AutomationMappings
{
    /// <summary>JobApplication ve Cv Include edilmis olmali. includeEvents: Events de Include edilmis olmali.</summary>
    public static AutomationJobResponse ToResponse(AutomationJob j, bool includeEvents) => new(
        j.Id,
        j.JobApplicationId,
        j.JobApplication.CompanyName,
        j.JobApplication.JobTitle,
        j.AttemptNumber,
        j.Mode,
        j.Status,
        j.CvId,
        j.Cv?.Name,
        j.ErrorMessage,
        j.ResultSummary,
        j.CreatedAt,
        j.StartedAt,
        j.FinishedAt,
        j.UpdatedAt,
        includeEvents
            ? j.Events.OrderBy(e => e.CreatedAt).Select(ToResponse).ToList()
            : null);

    public static AutomationEventResponse ToResponse(AutomationJobEvent e) => new(
        e.Id,
        e.Level,
        e.Step,
        e.Message,
        e.DataJson is null ? null : JsonDocument.Parse(e.DataJson).RootElement.Clone(),
        e.CreatedAt);
}

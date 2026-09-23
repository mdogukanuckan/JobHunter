using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.JobApplications.Dtos;

/// <summary>
/// Surukle-birak istegi: karti hedef sutuna (Status) ve o sutundaki hedef siraya (Position) tasir.
/// Ayni sutun icinde siralama degisikligi icin de kullanilir.
/// </summary>
public record MoveJobApplicationRequest(
    [EnumDataType(typeof(ApplicationStatus))] ApplicationStatus Status,
    [Range(0, int.MaxValue)] int Position);

using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.JobApplications.Dtos;

/// <summary>
/// Yeni kart olusturma istegi. Status verilmezse kart Wishlist sutununa, en alta eklenir.
/// CvId opsiyoneldir; verilirse kullaniciya ait ve silinmemis bir CV olmalidir.
/// </summary>
public record CreateJobApplicationRequest(
    [Required, MaxLength(200)] string CompanyName,
    [Required, MaxLength(200)] string JobTitle,
    [MaxLength(2000), Url] string? JobUrl,
    [MaxLength(200)] string? Location,
    [MaxLength(100)] string? Source,
    string? JobDescription,
    string? Notes,
    ApplicationStatus Status = ApplicationStatus.Wishlist,
    Guid? CvId = null);

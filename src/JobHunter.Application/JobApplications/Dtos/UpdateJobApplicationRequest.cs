using System.ComponentModel.DataAnnotations;

namespace JobHunter.Application.JobApplications.Dtos;

/// <summary>
/// Kart bilgilerini guncelleme istegi. Durum/sira degisikligi burada YAPILMAZ;
/// onun icin MoveJobApplicationRequest kullanilir (gecmis kaydi tutarli kalsin diye).
/// </summary>
public record UpdateJobApplicationRequest(
    [Required, MaxLength(200)] string CompanyName,
    [Required, MaxLength(200)] string JobTitle,
    [MaxLength(2000), Url] string? JobUrl,
    [MaxLength(200)] string? Location,
    [MaxLength(100)] string? Source,
    string? JobDescription,
    string? Notes);

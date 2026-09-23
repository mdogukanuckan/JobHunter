using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Profiles.Dtos;

/// <summary>
/// Alan -> politika eslemesi, orn. { "Gender": "Never", "ExpectedSalary": "Auto" }.
/// Sadece gonderilen alanlar degisir. Varsayilana donmek icin alanin varsayilan degerini gonder.
/// Gecerli anahtarlar: JobHunter.Domain.Profiles.ProfileFields.
/// </summary>
public record UpdateFieldPoliciesRequest([Required] Dictionary<string, AutofillPolicy> Policies);

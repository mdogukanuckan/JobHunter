using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Profiles.Dtos;

public record CustomFieldRequest(
    [Required, MaxLength(200)] string Label,
    [Required, MaxLength(2000)] string Value,
    [EnumDataType(typeof(AutofillPolicy))] AutofillPolicy Policy = AutofillPolicy.Auto);

public record CustomFieldResponse(Guid Id, string Label, string Value, AutofillPolicy Policy);

using System.ComponentModel.DataAnnotations;

namespace JobHunter.Application.Cvs.Dtos;

public record RenameCvRequest(
    [Required, MaxLength(150)] string Name);

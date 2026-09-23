using System.ComponentModel.DataAnnotations;

namespace JobHunter.Application.Auth.Dtos;

public record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MinLength(8), MaxLength(100)] string Password,
    [Required, MaxLength(150)] string FullName);

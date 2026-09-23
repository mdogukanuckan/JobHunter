namespace JobHunter.Application.Auth.Dtos;

public record CurrentUserResponse(Guid Id, string Email, string FullName);

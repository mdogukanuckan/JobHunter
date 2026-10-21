using System.ComponentModel.DataAnnotations;

namespace JobHunter.Application.Settings.Dtos;

/// <summary>Sirrin durumu. Deger ASLA donmez; sadece var mi ve son 4 karakteri.</summary>
public record SecretStatusDto(bool Configured, string? Last4);

/// <summary>Kaydedilecek sir. Ornek govde: {"value":"sk-ant-..."}</summary>
public record SetSecretRequest([Required, MaxLength(500)] string Value);

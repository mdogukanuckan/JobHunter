using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;

    /// <summary>Gorunum tercihi. Hesapta saklanir ki tum cihazlarda ayni tema gorunsun.</summary>
    public ThemePalette ThemePalette { get; set; } = ThemePalette.Ocean;
    public ThemeMode ThemeMode { get; set; } = ThemeMode.Light;

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
    public ICollection<Cv> Cvs { get; set; } = new List<Cv>();
    public CandidateProfile? CandidateProfile { get; set; }
    public ICollection<TodoItem> Todos { get; set; } = new List<TodoItem>();
}

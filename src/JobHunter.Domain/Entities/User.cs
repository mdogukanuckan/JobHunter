using JobHunter.Domain.Common;

namespace JobHunter.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
    public ICollection<Cv> Cvs { get; set; } = new List<Cv>();
    public CandidateProfile? CandidateProfile { get; set; }
}

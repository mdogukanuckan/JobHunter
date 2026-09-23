using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<JobApplication> JobApplications { get; }
    DbSet<ApplicationStatusHistory> ApplicationStatusHistories { get; }
    DbSet<Cv> Cvs { get; }
    DbSet<CandidateProfile> CandidateProfiles { get; }
    DbSet<WorkExperience> WorkExperiences { get; }
    DbSet<Education> Educations { get; }
    DbSet<ProfileLanguage> ProfileLanguages { get; }
    DbSet<ScreeningAnswer> ScreeningAnswers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

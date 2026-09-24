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
    DbSet<Interview> Interviews { get; }
    DbSet<TodoItem> TodoItems { get; }
    DbSet<Certificate> Certificates { get; }
    DbSet<ProfileReference> ProfileReferences { get; }
    DbSet<ProfileCustomField> ProfileCustomFields { get; }
    DbSet<ProfileFieldPolicy> ProfileFieldPolicies { get; }
    DbSet<AutomationJob> AutomationJobs { get; }
    DbSet<AutomationJobEvent> AutomationJobEvents { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

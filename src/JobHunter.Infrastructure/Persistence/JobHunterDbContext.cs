using JobHunter.Application.Common.Interfaces;
using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Infrastructure.Persistence;

public class JobHunterDbContext : DbContext, IApplicationDbContext
{
    public JobHunterDbContext(DbContextOptions<JobHunterDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<ApplicationStatusHistory> ApplicationStatusHistories => Set<ApplicationStatusHistory>();
    public DbSet<Cv> Cvs => Set<Cv>();
    public DbSet<CandidateProfile> CandidateProfiles => Set<CandidateProfile>();
    public DbSet<WorkExperience> WorkExperiences => Set<WorkExperience>();
    public DbSet<Education> Educations => Set<Education>();
    public DbSet<ProfileLanguage> ProfileLanguages => Set<ProfileLanguage>();
    public DbSet<ScreeningAnswer> ScreeningAnswers => Set<ScreeningAnswer>();
    public DbSet<Interview> Interviews => Set<Interview>();
    public DbSet<TodoItem> TodoItems => Set<TodoItem>();
    public DbSet<Certificate> Certificates => Set<Certificate>();
    public DbSet<ProfileReference> ProfileReferences => Set<ProfileReference>();
    public DbSet<ProfileCustomField> ProfileCustomFields => Set<ProfileCustomField>();
    public DbSet<ProfileFieldPolicy> ProfileFieldPolicies => Set<ProfileFieldPolicy>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(JobHunterDbContext).Assembly);
    }
}

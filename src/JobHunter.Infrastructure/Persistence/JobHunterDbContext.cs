using JobHunter.Application.Common.Interfaces;
using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Infrastructure.Persistence;

public class JobHunterDbContext : DbContext, IApplicationDbContext
{
    public JobHunterDbContext(DbContextOptions<JobHunterDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(JobHunterDbContext).Assembly);
    }
}

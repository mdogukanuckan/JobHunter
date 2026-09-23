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

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

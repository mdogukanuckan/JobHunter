using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class ApplicationStatusHistoryConfiguration : IEntityTypeConfiguration<ApplicationStatusHistory>
{
    public void Configure(EntityTypeBuilder<ApplicationStatusHistory> builder)
    {
        builder.ToTable("ApplicationStatusHistories");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.FromStatus)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(h => h.ToStatus)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(h => h.ChangedAt)
            .IsRequired();

        builder.HasIndex(h => new { h.JobApplicationId, h.ChangedAt });

        builder.HasOne(h => h.JobApplication)
            .WithMany(ja => ja.StatusHistory)
            .HasForeignKey(h => h.JobApplicationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

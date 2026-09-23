using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class WorkExperienceConfiguration : IEntityTypeConfiguration<WorkExperience>
{
    public void Configure(EntityTypeBuilder<WorkExperience> builder)
    {
        builder.ToTable("WorkExperiences");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.CompanyName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Title).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Location).HasMaxLength(200);
        // DateOnly -> PostgreSQL "date"; Description -> "text"

        builder.HasOne(x => x.CandidateProfile)
            .WithMany(p => p.WorkExperiences)
            .HasForeignKey(x => x.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

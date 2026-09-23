using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class EducationConfiguration : IEntityTypeConfiguration<Education>
{
    public void Configure(EntityTypeBuilder<Education> builder)
    {
        builder.ToTable("Educations");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.School).IsRequired().HasMaxLength(200);
        builder.Property(x => x.FieldOfStudy).HasMaxLength(200);
        builder.Property(x => x.Gpa).HasMaxLength(20);

        builder.Property(x => x.Degree)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.HasOne(x => x.CandidateProfile)
            .WithMany(p => p.Educations)
            .HasForeignKey(x => x.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

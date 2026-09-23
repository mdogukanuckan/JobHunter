using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class ProfileReferenceConfiguration : IEntityTypeConfiguration<ProfileReference>
{
    public void Configure(EntityTypeBuilder<ProfileReference> builder)
    {
        builder.ToTable("ProfileReferences");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.FullName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Company).HasMaxLength(200);
        builder.Property(x => x.Title).HasMaxLength(200);
        builder.Property(x => x.Relationship).HasMaxLength(100);
        builder.Property(x => x.PhoneNumber).HasMaxLength(30);
        builder.Property(x => x.Email).HasMaxLength(254);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasOne(x => x.CandidateProfile)
            .WithMany(p => p.References)
            .HasForeignKey(x => x.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

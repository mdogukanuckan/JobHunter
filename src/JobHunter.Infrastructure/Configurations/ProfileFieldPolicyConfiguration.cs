using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class ProfileFieldPolicyConfiguration : IEntityTypeConfiguration<ProfileFieldPolicy>
{
    public void Configure(EntityTypeBuilder<ProfileFieldPolicy> builder)
    {
        builder.ToTable("ProfileFieldPolicies");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.FieldKey).IsRequired().HasMaxLength(50);

        builder.Property(x => x.Policy)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        // Bir alan icin tek politika.
        builder.HasIndex(x => new { x.CandidateProfileId, x.FieldKey }).IsUnique();

        builder.HasOne(x => x.CandidateProfile)
            .WithMany(p => p.FieldPolicies)
            .HasForeignKey(x => x.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

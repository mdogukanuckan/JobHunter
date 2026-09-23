using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class ProfileCustomFieldConfiguration : IEntityTypeConfiguration<ProfileCustomField>
{
    public void Configure(EntityTypeBuilder<ProfileCustomField> builder)
    {
        builder.ToTable("ProfileCustomFields");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Label).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Value).IsRequired().HasMaxLength(2000);

        builder.Property(x => x.Policy)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        // Ayni profilde ayni etiket bir kez (buyuk/kucuk harf serviste normalize edilir).
        builder.HasIndex(x => new { x.CandidateProfileId, x.Label }).IsUnique();

        builder.HasOne(x => x.CandidateProfile)
            .WithMany(p => p.CustomFields)
            .HasForeignKey(x => x.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

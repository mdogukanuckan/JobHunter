using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class ProfileLanguageConfiguration : IEntityTypeConfiguration<ProfileLanguage>
{
    public void Configure(EntityTypeBuilder<ProfileLanguage> builder)
    {
        builder.ToTable("ProfileLanguages");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(50);

        builder.Property(x => x.Level)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(10);

        // Ayni profilde ayni dil bir kez. (Buyuk/kucuk harf farki serviste normalize edilir.)
        builder.HasIndex(x => new { x.CandidateProfileId, x.Name }).IsUnique();

        builder.HasOne(x => x.CandidateProfile)
            .WithMany(p => p.Languages)
            .HasForeignKey(x => x.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

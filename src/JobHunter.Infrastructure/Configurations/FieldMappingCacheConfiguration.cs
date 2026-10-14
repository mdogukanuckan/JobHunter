using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class FieldMappingCacheConfiguration : IEntityTypeConfiguration<FieldMappingCache>
{
    public void Configure(EntityTypeBuilder<FieldMappingCache> builder)
    {
        builder.ToTable("FieldMappingCaches");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.NormalizedLabel).IsRequired().HasMaxLength(300);
        builder.Property(x => x.FieldType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.TargetKind).HasMaxLength(20);
        builder.Property(x => x.TargetKey).HasMaxLength(100);

        // Ayni profil + etiket + tip icin tek karar; bulunursa Claude'a tekrar sorulmaz.
        builder.HasIndex(x => new { x.CandidateProfileId, x.NormalizedLabel, x.FieldType }).IsUnique();

        builder.HasOne(x => x.CandidateProfile)
            .WithMany(p => p.FieldMappingCaches)
            .HasForeignKey(x => x.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

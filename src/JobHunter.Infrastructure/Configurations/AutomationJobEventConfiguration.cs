using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class AutomationJobEventConfiguration : IEntityTypeConfiguration<AutomationJobEvent>
{
    public void Configure(EntityTypeBuilder<AutomationJobEvent> builder)
    {
        builder.ToTable("AutomationJobEvents");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Level).IsRequired().HasConversion<string>().HasMaxLength(10);
        builder.Property(e => e.Step).HasMaxLength(100);
        builder.Property(e => e.Message).IsRequired().HasMaxLength(2000);
        // jsonb: PostgreSQL JSON'u dogrular ve ileride icinde sorgu yapilabilir.
        builder.Property(e => e.DataJson).HasColumnType("jsonb");

        // Zaman cizelgesi: bir isin olaylari eskiden yeniye.
        builder.HasIndex(e => new { e.AutomationJobId, e.CreatedAt });

        builder.HasOne(e => e.AutomationJob)
            .WithMany(j => j.Events)
            .HasForeignKey(e => e.AutomationJobId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

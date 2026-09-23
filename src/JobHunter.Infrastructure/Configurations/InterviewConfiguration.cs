using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class InterviewConfiguration : IEntityTypeConfiguration<Interview>
{
    public void Configure(EntityTypeBuilder<Interview> builder)
    {
        builder.ToTable("Interviews");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Location).HasMaxLength(300);
        builder.Property(i => i.MeetingUrl).HasMaxLength(2000);
        builder.Property(i => i.Interviewers).HasMaxLength(500);
        // PreparationNotes / FeedbackNotes -> text

        builder.Property(i => i.Type).IsRequired().HasConversion<string>().HasMaxLength(30);
        builder.Property(i => i.Format).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(i => i.Outcome).IsRequired().HasConversion<string>().HasMaxLength(20);

        // "Yaklasan mulakatlar" ve takvim sorgulari zamana gore filtreler.
        builder.HasIndex(i => new { i.JobApplicationId, i.ScheduledAt });
        builder.HasIndex(i => i.ScheduledAt);

        // Basvuru silinirse mulakatlari da silinir.
        builder.HasOne(i => i.JobApplication)
            .WithMany(ja => ja.Interviews)
            .HasForeignKey(i => i.JobApplicationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

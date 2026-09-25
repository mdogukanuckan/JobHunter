using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class AutomationJobConfiguration : IEntityTypeConfiguration<AutomationJob>
{
    public void Configure(EntityTypeBuilder<AutomationJob> builder)
    {
        builder.ToTable("AutomationJobs");

        builder.HasKey(j => j.Id);

        builder.Property(j => j.Mode).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(j => j.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(j => j.ErrorMessage).HasMaxLength(2000);
        builder.Property(j => j.ResultSummary).HasMaxLength(2000);

        // Faz 11: onay ekrani
        builder.Property(j => j.ReviewReportJson).HasColumnType("jsonb");
        builder.Property(j => j.ReviewScreenshotKey).HasMaxLength(260);
        builder.Property(j => j.ApprovalAnswersJson).HasColumnType("jsonb");
        builder.Property(j => j.KvkkAccepted).IsRequired().HasDefaultValue(false);

        // Ayni basvurunun deneme numaralari tekrar etmez (1, 2, 3...).
        builder.HasIndex(j => new { j.JobApplicationId, j.AttemptNumber }).IsUnique();
        // Liste / pano sorgulari: "aktif isler", "basarisiz olanlar".
        builder.HasIndex(j => new { j.Status, j.CreatedAt });

        // Basvuru silinirse denemeleri de silinir.
        builder.HasOne(j => j.JobApplication)
            .WithMany(ja => ja.AutomationJobs)
            .HasForeignKey(j => j.JobApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        // CV'ler soft delete edilir, normalde hic silinmez; yine de silinirse deneme kaybolmasin.
        builder.HasOne(j => j.Cv)
            .WithMany()
            .HasForeignKey(j => j.CvId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

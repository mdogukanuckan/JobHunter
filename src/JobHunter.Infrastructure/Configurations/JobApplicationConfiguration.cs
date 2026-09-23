using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class JobApplicationConfiguration : IEntityTypeConfiguration<JobApplication>
{
    public void Configure(EntityTypeBuilder<JobApplication> builder)
    {
        builder.ToTable("JobApplications");

        builder.HasKey(ja => ja.Id);

        builder.Property(ja => ja.CompanyName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(ja => ja.JobTitle)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(ja => ja.JobUrl).HasMaxLength(2000);
        builder.Property(ja => ja.Location).HasMaxLength(200);
        builder.Property(ja => ja.Source).HasMaxLength(100);
        // JobDescription ve Notes uzunluk sinirsiz (PostgreSQL "text")

        // Enum veritabaninda "Applied" gibi string olarak saklanir.
        builder.Property(ja => ja.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        // Kanban sorgusu: "kullanicinin kartlarini sutun + sira bazinda getir"
        builder.HasIndex(ja => new { ja.UserId, ja.Status, ja.Position });

        builder.HasOne(ja => ja.User)
            .WithMany(u => u.JobApplications)
            .HasForeignKey(ja => ja.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // CV'ler normalde soft delete edilir; fiziksel silme olursa basvuru kalir, bag kopar.
        builder.HasOne(ja => ja.Cv)
            .WithMany(cv => cv.JobApplications)
            .HasForeignKey(ja => ja.CvId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

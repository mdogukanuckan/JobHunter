using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class CandidateProfileConfiguration : IEntityTypeConfiguration<CandidateProfile>
{
    public void Configure(EntityTypeBuilder<CandidateProfile> builder)
    {
        builder.ToTable("CandidateProfiles");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Headline).HasMaxLength(200);
        builder.Property(p => p.PhoneNumber).HasMaxLength(30);
        builder.Property(p => p.City).HasMaxLength(100);
        builder.Property(p => p.Country).HasMaxLength(100);
        builder.Property(p => p.LinkedInUrl).HasMaxLength(500);
        builder.Property(p => p.GitHubUrl).HasMaxLength(500);
        builder.Property(p => p.PortfolioUrl).HasMaxLength(500);
        builder.Property(p => p.SalaryCurrency).HasMaxLength(3);
        builder.Property(p => p.WorkAuthorization).HasMaxLength(500);
        // Summary uzunluk sinirsiz (text)

        // Para icin float/double degil, sabit hassasiyetli numeric kullanilir (yuvarlama hatasi olmaz).
        builder.Property(p => p.ExpectedSalary).HasPrecision(12, 2);

        builder.Property(p => p.PreferredWorkMode)
            .HasConversion<string>()
            .HasMaxLength(20);

        // List<string> -> Npgsql bunu otomatik olarak PostgreSQL text[] kolonuna esler.
        builder.Property(p => p.Skills).IsRequired();

        // 1-1 iliski: UserId uzerindeki unique index "bir kullanicinin tek profili" kuralini DB seviyesinde garanti eder.
        builder.HasIndex(p => p.UserId).IsUnique();

        builder.HasOne(p => p.User)
            .WithOne(u => u.CandidateProfile)
            .HasForeignKey<CandidateProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // CV normalde soft delete edilir (CvService varsayilan CV'yi temizler);
        // fiziksel silme olursa da profil kalir, sadece bag kopar.
        builder.HasOne(p => p.DefaultCv)
            .WithMany()
            .HasForeignKey(p => p.DefaultCvId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class CvConfiguration : IEntityTypeConfiguration<Cv>
{
    public void Configure(EntityTypeBuilder<Cv> builder)
    {
        builder.ToTable("Cvs");

        builder.HasKey(cv => cv.Id);

        builder.Property(cv => cv.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(cv => cv.OriginalFileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(cv => cv.StorageKey)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(cv => cv.ContentType)
            .IsRequired()
            .HasMaxLength(100);

        // Her dosya depolamada tek bir kayda karsilik gelir.
        builder.HasIndex(cv => cv.StorageKey).IsUnique();

        // CV listesi sorgusu: "kullanicinin silinmemis CV'leri"
        builder.HasIndex(cv => new { cv.UserId, cv.IsDeleted });

        // Bilincli olarak global query filter (HasQueryFilter(!IsDeleted)) KULLANMIYORUZ:
        // o filtre, JobApplication.Include(Cv) sorgularinda silinmis CV'yi null gosterirdi
        // ve "gecmis basvuruda hangi CV kullanildi" bilgisi kaybolurdu.
        // Silinmis CV'ler sadece CvService'teki liste/detay sorgularinda elenir.

        builder.HasOne(cv => cv.User)
            .WithMany(u => u.Cvs)
            .HasForeignKey(cv => cv.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

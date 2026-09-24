using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.PasswordHash)
            .IsRequired();

        builder.Property(u => u.FullName)
            .IsRequired()
            .HasMaxLength(200);

        // Enum'lar metin olarak saklanir (DB'de okunabilir, siralama degisse de bozulmaz).
        // Varsayilan deger: migration mevcut kullanicilara da bu degerleri yazar.
        builder.Property(u => u.ThemePalette)
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(ThemePalette.Forest);

        builder.Property(u => u.ThemeMode)
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(ThemeMode.System);
    }
}
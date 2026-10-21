using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class UserSecretConfiguration : IEntityTypeConfiguration<UserSecret>
{
    public void Configure(EntityTypeBuilder<UserSecret> builder)
    {
        builder.ToTable("UserSecrets");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Kind).IsRequired().HasConversion<string>().HasMaxLength(30);
        builder.Property(s => s.EncryptedValue).IsRequired().HasMaxLength(2000);
        builder.Property(s => s.Last4).IsRequired().HasMaxLength(8);

        // Her kullanicinin her turden tek sirri olur (yeniden girmek = ustune yazmak).
        builder.HasIndex(s => new { s.UserId, s.Kind }).IsUnique();

        builder.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

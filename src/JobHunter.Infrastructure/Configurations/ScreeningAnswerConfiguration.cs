using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class ScreeningAnswerConfiguration : IEntityTypeConfiguration<ScreeningAnswer>
{
    public void Configure(EntityTypeBuilder<ScreeningAnswer> builder)
    {
        builder.ToTable("ScreeningAnswers");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Question).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Answer).IsRequired();   // text
        builder.Property(x => x.Tags).IsRequired();     // text[]

        builder.HasOne(x => x.CandidateProfile)
            .WithMany(p => p.ScreeningAnswers)
            .HasForeignKey(x => x.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

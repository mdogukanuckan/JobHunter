using JobHunter.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobHunter.Infrastructure.Persistence.Configurations;

public class TodoItemConfiguration : IEntityTypeConfiguration<TodoItem>
{
    public void Configure(EntityTypeBuilder<TodoItem> builder)
    {
        builder.ToTable("TodoItems");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Title).IsRequired().HasMaxLength(300);
        // Description -> text

        builder.Property(t => t.Priority).IsRequired().HasConversion<string>().HasMaxLength(10);

        // Liste sorgusu: "kullanicinin tamamlanmamis gorevleri, son tarihe gore"
        builder.HasIndex(t => new { t.UserId, t.IsCompleted, t.DueAt });

        builder.HasOne(t => t.User)
            .WithMany(u => u.Todos)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Basvuru veya mulakat silinirse gorev kaybolmaz; sadece baglantisi kopar (genel goreve doner).
        builder.HasOne(t => t.JobApplication)
            .WithMany(ja => ja.Todos)
            .HasForeignKey(t => t.JobApplicationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.Interview)
            .WithMany(i => i.Todos)
            .HasForeignKey(t => t.InterviewId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

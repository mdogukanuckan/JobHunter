using JobHunter.Domain.Common;
using JobHunter.Domain.Enums;

namespace JobHunter.Domain.Entities;

/// <summary>
/// Bir basvuruya ait tek bir mulakat (JobApplication 1-N Interview).
/// Ayri UserId tutulmaz: sahiplik basvuru uzerinden (JobApplication.UserId) belirlenir.
/// </summary>
public class Interview : BaseEntity
{
    public Guid JobApplicationId { get; set; }
    public JobApplication JobApplication { get; set; } = null!;

    /// <summary>Baslangic zamani, her zaman UTC saklanir. Gosterirken kullanicinin saat dilimine cevrilir.</summary>
    public DateTime ScheduledAt { get; set; }
    public int? DurationMinutes { get; set; }

    public InterviewType Type { get; set; }
    public InterviewFormat Format { get; set; }

    public string? Location { get; set; }       // OnSite ise adres
    public string? MeetingUrl { get; set; }     // Online ise Zoom/Meet/Teams linki
    public string? Interviewers { get; set; }   // Serbest metin: "Ayse Y. (Tech Lead), Mehmet K."

    public string? PreparationNotes { get; set; }  // Mulakat oncesi: calisilacak konular, sorulacak sorular
    public string? FeedbackNotes { get; set; }     // Mulakat sonrasi: nasil gecti, sorulanlar

    public InterviewOutcome Outcome { get; set; } = InterviewOutcome.Pending;

    public ICollection<TodoItem> Todos { get; set; } = new List<TodoItem>();
}

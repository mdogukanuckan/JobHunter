namespace JobHunter.Domain.Common;

/// <summary>
/// Tum domain entity'lerinin turedigi taban sinif.
/// Framework'e bagimliligi olmamali (EF Core, ASP.NET vb. referans etmez).
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

using System.ComponentModel.DataAnnotations;

namespace JobHunter.API.Models;

/// <summary>
/// multipart/form-data yukleme formu. IFormFile bir ASP.NET Core tipidir,
/// bu yuzden Application DTO'su degil API katmanina ait bir model olarak burada durur.
/// </summary>
public class UploadCvForm
{
    [Required]
    public IFormFile File { get; set; } = null!;

    /// <summary>Gorunen ad (orn. "Backend Developer CV"). Bos birakilirsa dosya adi kullanilir.</summary>
    [MaxLength(150)]
    public string? Name { get; set; }
}

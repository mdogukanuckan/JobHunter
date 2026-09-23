namespace JobHunter.Application.Cvs;

/// <summary>
/// CV yukleme kurallari. Degerler Infrastructure'da appsettings'ten ("Storage:MaxCvSizeBytes") okunup DI'a eklenir.
/// </summary>
public record CvUploadSettings(long MaxSizeBytes)
{
    public const long DefaultMaxSizeBytes = 5 * 1024 * 1024; // 5 MB
}

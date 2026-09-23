namespace JobHunter.Application.Cvs.Dtos;

/// <summary>
/// CV yukleme girdisi. API katmani IFormFile'i bu modele cevirir;
/// boylece Application katmani ASP.NET Core'a bagimli olmaz.
/// </summary>
public record UploadCvCommand(
    string? Name,
    string FileName,
    long SizeBytes,
    Stream Content);

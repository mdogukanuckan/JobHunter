namespace JobHunter.Application.Cvs.Dtos;

/// <summary>Indirme sonucu: dosya akisi + tarayiciya gonderilecek tur ve ad. Akisi cagiran taraf kapatir.</summary>
public record CvFileResult(
    Stream Content,
    string ContentType,
    string FileName);

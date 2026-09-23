namespace JobHunter.Application.Cvs.Dtos;

/// <summary>CV listesinde ve detayinda donen model. StorageKey bilincli olarak disari verilmez.</summary>
public record CvResponse(
    Guid Id,
    string Name,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

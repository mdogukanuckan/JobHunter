using JobHunter.Application.Cvs.Dtos;

namespace JobHunter.Application.Cvs.Interfaces;

/// <summary>
/// CV yonetimi. Tum metotlar sadece giris yapmis kullanicinin CV'leri uzerinde calisir;
/// baskasina ait veya olmayan bir CV istenirse KeyNotFoundException firlatilir.
/// </summary>
public interface ICvService
{
    /// <summary>Kullanicinin silinmemis CV'leri (en yeni en ustte).</summary>
    Task<IReadOnlyList<CvResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<CvResponse> UploadAsync(UploadCvCommand command, CancellationToken cancellationToken = default);

    Task<CvResponse> RenameAsync(Guid id, RenameCvRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// CV dosyasini indirir. Soft delete edilmis CV'ler de indirilebilir:
    /// gecmis bir basvuruda hangi dosyanin gonderildigi gorulebilsin diye.
    /// </summary>
    Task<CvFileResult> DownloadAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Soft delete: CV listeden kalkar, kayit ve dosya saklanir.</summary>
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

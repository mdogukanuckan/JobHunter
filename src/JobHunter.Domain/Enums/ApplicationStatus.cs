namespace JobHunter.Domain.Enums;

/// <summary>
/// Is basvurusunun Kanban pipeline'indaki durumu (her deger bir sutun).
/// Degerler veritabaninda string olarak saklanir; siralamayi degistirmek veriyi bozmaz.
/// </summary>
public enum ApplicationStatus
{
    Wishlist = 0,   // Kaydedildi, henuz basvurulmadi
    Applied = 1,    // Basvuru gonderildi
    Interview = 2,  // Mulakat surecinde
    Offer = 3,      // Teklif alindi
    Rejected = 4,   // Reddedildi
    Withdrawn = 5   // Kullanici basvuruyu geri cekti
}

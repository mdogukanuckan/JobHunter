namespace JobHunter.Domain.Enums;

/// <summary>
/// Otomasyon (Faz 10-11) bir profil bilgisini basvuru formuna yazarken nasil davranacak.
/// </summary>
public enum AutofillPolicy
{
    Auto,      // Sormadan doldur
    AskFirst,  // Insan onayi adiminda (Faz 11) once kullaniciya sor
    Never      // Asla doldurma; zorunlu alansa basvuruyu onaya dusur
}

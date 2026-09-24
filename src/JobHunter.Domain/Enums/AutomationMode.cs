namespace JobHunter.Domain.Enums;

/// <summary>Otomasyonun basvuruyu gondermeden once kullaniciya sorup sormayacagi.</summary>
public enum AutomationMode
{
    HumanApproval,  // Varsayilan: formu doldurur, "Gonder"e basmadan once onay bekler (Faz 11)
    Automatic       // Onay beklemeden gonderir (sadece AskFirst alan gerekmiyorsa)
}

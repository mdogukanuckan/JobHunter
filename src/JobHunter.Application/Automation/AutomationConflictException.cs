namespace JobHunter.Application.Automation;

/// <summary>
/// Istek gecerli ama isin su anki durumuyla celisiyor: orn. basvurunun zaten devam eden bir denemesi var,
/// ya da iptal edilmis bir ise n8n "Running" gondermeye calisiyor. API'de 409 Conflict'e cevrilir.
/// n8n akisi 409 aldiginda "bu is artik benim degil" diye anlayip durabilir.
/// </summary>
public class AutomationConflictException : Exception
{
    public AutomationConflictException(string message) : base(message) { }
}

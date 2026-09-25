namespace JobHunter.Domain.Enums;

/// <summary>
/// Faz 11: n8n/worker'a hangi turu calistiracagini soyler.
///   Fill   → formu doldur, GONDERME; inceleme raporu + ekran goruntusu yukle, AwaitingApproval'e dus.
///   Submit → onay cevaplariyla formu (bastan) doldur ve gonder.
/// </summary>
public enum AutomationDispatchPhase
{
    Fill,
    Submit
}

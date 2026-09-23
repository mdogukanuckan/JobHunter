namespace JobHunter.Application.Common.Exceptions;

/// <summary>
/// Istek formati dogru ama is kuralina uymuyor (orn. baskasinin basvurusuna mulakat eklemek,
/// mulakati farkli bir basvurunun gorevine baglamak). API katmaninda 400 Bad Request'e cevrilir.
/// Faz 6'dan itibaren yeni moduller bunu kullanir; CvValidationException / ProfileValidationException
/// ileride global exception middleware ile birlikte buna birlestirilebilir.
/// </summary>
public class BusinessValidationException : Exception
{
    public BusinessValidationException(string message) : base(message) { }
}

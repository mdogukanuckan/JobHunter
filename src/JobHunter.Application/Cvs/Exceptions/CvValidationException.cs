namespace JobHunter.Application.Cvs.Exceptions;

/// <summary>Yuklenen dosya kurallara uymadiginda firlatilir (tur, boyut, icerik). API bunu 400'e cevirir.</summary>
public class CvValidationException : Exception
{
    public CvValidationException(string message) : base(message) { }
}

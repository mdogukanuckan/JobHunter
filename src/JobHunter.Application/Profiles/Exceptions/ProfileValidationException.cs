namespace JobHunter.Application.Profiles.Exceptions;

/// <summary>Profil verisi is kurallarina uymadiginda firlatilir; API katmaninda 400 Bad Request'e cevrilir.</summary>
public class ProfileValidationException : Exception
{
    public ProfileValidationException(string message) : base(message) { }
}

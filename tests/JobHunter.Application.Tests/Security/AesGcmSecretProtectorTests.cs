using System.Security.Cryptography;
using FluentAssertions;
using JobHunter.Infrastructure.Security;
using Xunit;

namespace JobHunter.Application.Tests.Security;

public class AesGcmSecretProtectorTests
{
    private static string NewKey() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private const string Context = "11111111111111111111111111111111:Anthropic";
    private const string Secret = "sk-ant-api03-ÖrnekAnahtar_0123456789";

    [Fact]
    public void Protect_ThenUnprotect_ReturnsOriginal_IncludingNonAscii()
    {
        var protector = new AesGcmSecretProtector(NewKey());

        var encrypted = protector.Protect(Secret, Context);

        protector.Unprotect(encrypted, Context).Should().Be(Secret);
    }

    [Fact]
    public void Ciphertext_DoesNotContainThePlaintext()
    {
        var protector = new AesGcmSecretProtector(NewKey());

        var encrypted = protector.Protect(Secret, Context);

        encrypted.Should().NotContain("sk-ant");
        // Bayt DIZISI olarak ara (NotContain(IEnumerable) her baytı ayrı ayrı arar ve rastgele veride tesadüfen eşleşir).
        System.Text.Encoding.Latin1.GetString(Convert.FromBase64String(encrypted)).Should().NotContain("sk-ant");
    }

    [Fact]
    public void SamePlaintext_EncryptedTwice_GivesDifferentCiphertexts()
    {
        var protector = new AesGcmSecretProtector(NewKey());

        protector.Protect(Secret, Context).Should().NotBe(protector.Protect(Secret, Context));
    }

    [Fact]
    public void DifferentContext_CannotDecrypt_SoRowsCannotBeSwapped()
    {
        var protector = new AesGcmSecretProtector(NewKey());
        var encrypted = protector.Protect(Secret, Context);

        var act = () => protector.Unprotect(encrypted, "22222222222222222222222222222222:Anthropic");

        act.Should().Throw<CryptographicException>();
    }

    [Fact]
    public void DifferentMasterKey_CannotDecrypt()
    {
        var encrypted = new AesGcmSecretProtector(NewKey()).Protect(Secret, Context);

        var act = () => new AesGcmSecretProtector(NewKey()).Unprotect(encrypted, Context);

        act.Should().Throw<CryptographicException>();
    }

    [Fact]
    public void TamperedCiphertext_IsDetected()
    {
        var protector = new AesGcmSecretProtector(NewKey());
        var data = Convert.FromBase64String(protector.Protect(Secret, Context));
        data[^1] ^= 0x01;

        var act = () => protector.Unprotect(Convert.ToBase64String(data), Context);

        act.Should().Throw<CryptographicException>();
    }

    [Theory]
    [InlineData("not base64 !!!")]
    [InlineData("")]
    [InlineData("AAAA")]
    public void GarbageInput_ThrowsCryptographicException(string garbage)
    {
        var protector = new AesGcmSecretProtector(NewKey());

        var act = () => protector.Unprotect(garbage, Context);

        act.Should().Throw<CryptographicException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-base64!")]
    [InlineData("AAAA")]   // dogru base64 ama 32 bayt degil
    public void MissingOrInvalidMasterKey_FailsWithExplanatoryError_OnlyWhenUsed(string? masterKey)
    {
        var construct = () => new AesGcmSecretProtector(masterKey);
        construct.Should().NotThrow();

        var act = () => new AesGcmSecretProtector(masterKey).Protect(Secret, Context);

        act.Should().Throw<InvalidOperationException>().WithMessage("*Secrets:MasterKey*");
    }
}

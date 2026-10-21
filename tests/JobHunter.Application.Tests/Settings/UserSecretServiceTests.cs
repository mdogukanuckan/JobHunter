using System.Net;
using System.Security.Cryptography;
using FluentAssertions;
using JobHunter.Application.Automation.Interfaces;
using JobHunter.Application.Common.Exceptions;
using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Settings.Services;
using JobHunter.Domain.Entities;
using JobHunter.Domain.Enums;
using JobHunter.Infrastructure.Persistence;
using JobHunter.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace JobHunter.Application.Tests.Settings;

public class UserSecretServiceTests
{
    private const string ValidKey = "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ-a3f9";

    private readonly JobHunterDbContext _db;
    private readonly AesGcmSecretProtector _protector = new(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
    private readonly Mock<IAnthropicClient> _anthropic = new();
    private readonly Guid _userId = Guid.NewGuid();

    public UserSecretServiceTests()
    {
        _db = new JobHunterDbContext(new DbContextOptionsBuilder<JobHunterDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    }

    private UserSecretService CreateService(Guid? asUser = null)
    {
        var currentUser = new Mock<ICurrentUserService>();
        currentUser.Setup(c => c.GetRequiredUserId()).Returns(asUser ?? _userId);
        return new UserSecretService(_db, currentUser.Object, _protector, _anthropic.Object, NullLogger<UserSecretService>.Instance);
    }

    private void AnthropicAccepts()
        => _anthropic.Setup(a => a.CompleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("OK");

    private void AnthropicThrows(Exception ex)
        => _anthropic.Setup(a => a.CompleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(ex);

    [Fact]
    public async Task Set_StoresOnlyEncryptedValue_AndReturnsMaskedStatus()
    {
        AnthropicAccepts();

        var status = await CreateService().SetAsync(UserSecretKind.Anthropic, $"  {ValidKey}  ");

        status.Should().Be(new JobHunter.Application.Settings.Dtos.SecretStatusDto(true, "a3f9"));
        var row = await _db.UserSecrets.SingleAsync();
        row.UserId.Should().Be(_userId);
        row.EncryptedValue.Should().NotContain("sk-ant").And.NotContain("ABCDEFGH");
        row.Last4.Should().Be("a3f9");
    }

    [Fact]
    public async Task Set_SendsTheTrimmedKeyToAnthropicForVerification()
    {
        AnthropicAccepts();

        await CreateService().SetAsync(UserSecretKind.Anthropic, $"  {ValidKey}\n");

        _anthropic.Verify(a => a.CompleteAsync(ValidKey, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Set_RejectedByAnthropic_SavesNothing()
    {
        AnthropicThrows(new HttpRequestException("401", null, HttpStatusCode.Unauthorized));

        var act = () => CreateService().SetAsync(UserSecretKind.Anthropic, ValidKey);

        (await act.Should().ThrowAsync<BusinessValidationException>()).WithMessage("*kabul etmedi*");
        (await _db.UserSecrets.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Set_WhenAnthropicUnreachable_SavesNothing_WithDifferentMessage()
    {
        AnthropicThrows(new HttpRequestException("down", null, HttpStatusCode.BadGateway));

        var act = () => CreateService().SetAsync(UserSecretKind.Anthropic, ValidKey);

        (await act.Should().ThrowAsync<BusinessValidationException>()).WithMessage("*doğrulanamadı*");
        (await _db.UserSecrets.CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData("kisa")]
    [InlineData("sk-ant-api03-icinde bosluk var ABCDEFGHIJKLMNOP")]
    [InlineData("")]
    public async Task Set_MalformedValue_IsRejected_WithoutCallingAnthropic(string value)
    {
        var act = () => CreateService().SetAsync(UserSecretKind.Anthropic, value);

        await act.Should().ThrowAsync<BusinessValidationException>();
        _anthropic.Verify(a => a.CompleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Set_Twice_ReplacesTheSameRow()
    {
        AnthropicAccepts();
        var service = CreateService();

        await service.SetAsync(UserSecretKind.Anthropic, ValidKey);
        await service.SetAsync(UserSecretKind.Anthropic, "sk-ant-api03-ZZZZZZZZZZZZZZZZZZZZZZZZZZ-b7c1");

        (await _db.UserSecrets.CountAsync()).Should().Be(1);
        (await service.GetStatusAsync(UserSecretKind.Anthropic)).Last4.Should().Be("b7c1");
    }

    [Fact]
    public async Task Status_BeforeAnythingSaved_IsNotConfigured()
    {
        (await CreateService().GetStatusAsync(UserSecretKind.Anthropic)).Should().Be(new JobHunter.Application.Settings.Dtos.SecretStatusDto(false, null));
    }

    [Fact]
    public async Task Status_IsPerUser()
    {
        AnthropicAccepts();
        await CreateService().SetAsync(UserSecretKind.Anthropic, ValidKey);

        var other = await CreateService(Guid.NewGuid()).GetStatusAsync(UserSecretKind.Anthropic);

        other.Configured.Should().BeFalse();
    }

    [Fact]
    public async Task Remove_DeletesTheSecret_AndIsIdempotent()
    {
        AnthropicAccepts();
        var service = CreateService();
        await service.SetAsync(UserSecretKind.Anthropic, ValidKey);

        await service.RemoveAsync(UserSecretKind.Anthropic);
        await service.RemoveAsync(UserSecretKind.Anthropic);

        (await _db.UserSecrets.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Reader_ReturnsTheDecryptedKey_ForItsOwner_AndNullOtherwise()
    {
        AnthropicAccepts();
        var service = CreateService();
        await service.SetAsync(UserSecretKind.Anthropic, ValidKey);

        (await service.GetPlaintextAsync(_userId, UserSecretKind.Anthropic)).Should().Be(ValidKey);
        (await service.GetPlaintextAsync(Guid.NewGuid(), UserSecretKind.Anthropic)).Should().BeNull();
    }

    [Fact]
    public async Task Reader_RowCopiedToAnotherUser_CannotBeDecrypted()
    {
        AnthropicAccepts();
        await CreateService().SetAsync(UserSecretKind.Anthropic, ValidKey);
        var stolen = (await _db.UserSecrets.SingleAsync()).EncryptedValue;

        var attacker = Guid.NewGuid();
        _db.UserSecrets.Add(new UserSecret { UserId = attacker, Kind = UserSecretKind.Anthropic, EncryptedValue = stolen, Last4 = "xxxx" });
        await _db.SaveChangesAsync();

        (await CreateService().GetPlaintextAsync(attacker, UserSecretKind.Anthropic)).Should().BeNull();
    }

    [Fact]
    public async Task Reader_AfterMasterKeyChange_ReturnsNull_InsteadOfThrowing()
    {
        AnthropicAccepts();
        await CreateService().SetAsync(UserSecretKind.Anthropic, ValidKey);

        var rotated = new UserSecretService(_db, Mock.Of<ICurrentUserService>(), new AesGcmSecretProtector(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))),
            _anthropic.Object, NullLogger<UserSecretService>.Instance);

        (await rotated.GetPlaintextAsync(_userId, UserSecretKind.Anthropic)).Should().BeNull();
    }
}

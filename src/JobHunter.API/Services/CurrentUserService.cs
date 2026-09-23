using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using JobHunter.Application.Common.Interfaces;

namespace JobHunter.API.Services;

/// <summary>
/// Kullanici Id'sini JWT icindeki "sub" claim'inden okur.
/// Not: JwtBearer varsayilan olarak "sub"u ClaimTypes.NameIdentifier'a cevirir, bu yuzden ikisine de bakiyoruz.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var value = user?.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? user?.FindFirstValue(JwtRegisteredClaimNames.Sub);

            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public Guid GetRequiredUserId() =>
        UserId ?? throw new UnauthorizedAccessException("Kullanici kimligi dogrulanamadi.");
}

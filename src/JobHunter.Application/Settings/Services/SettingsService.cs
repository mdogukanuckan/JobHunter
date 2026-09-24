using JobHunter.Application.Common.Interfaces;
using JobHunter.Application.Settings.Dtos;
using JobHunter.Application.Settings.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace JobHunter.Application.Settings.Services;

/// <summary>Kullanici ayarlari. Simdilik sadece gorunum (tema); ileride dil, bildirim tercihleri buraya eklenebilir.</summary>
public class SettingsService : ISettingsService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public SettingsService(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<AppearanceSettingsDto> GetAppearanceAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new AppearanceSettingsDto(u.ThemePalette, u.ThemeMode))
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Kullanici bulunamadi.");
    }

    public async Task<AppearanceSettingsDto> UpdateAppearanceAsync(AppearanceSettingsDto request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken)
                   ?? throw new KeyNotFoundException("Kullanici bulunamadi.");

        user.ThemePalette = request.Palette;
        user.ThemeMode = request.Mode;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return new AppearanceSettingsDto(user.ThemePalette, user.ThemeMode);
    }
}

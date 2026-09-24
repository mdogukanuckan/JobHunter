using JobHunter.Application.Settings.Dtos;

namespace JobHunter.Application.Settings.Interfaces;

public interface ISettingsService
{
    Task<AppearanceSettingsDto> GetAppearanceAsync(CancellationToken cancellationToken = default);
    Task<AppearanceSettingsDto> UpdateAppearanceAsync(AppearanceSettingsDto request, CancellationToken cancellationToken = default);
}

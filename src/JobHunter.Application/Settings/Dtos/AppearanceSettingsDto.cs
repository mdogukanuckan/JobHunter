using System.ComponentModel.DataAnnotations;
using JobHunter.Domain.Enums;

namespace JobHunter.Application.Settings.Dtos;

/// <summary>Gorunum tercihi: renk paleti + acik/koyu mod. Hem okuma hem guncelleme (PUT) icin kullanilir.</summary>
public record AppearanceSettingsDto(
    [EnumDataType(typeof(ThemePalette))] ThemePalette Palette,
    [EnumDataType(typeof(ThemeMode))] ThemeMode Mode);

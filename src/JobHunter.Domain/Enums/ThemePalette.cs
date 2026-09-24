namespace JobHunter.Domain.Enums;

/// <summary>Arayuz renk paleti. Renk degerleri frontend'de tanimlidir; backend sadece secimi saklar.</summary>
public enum ThemePalette
{
    // Ilk deger C# varsayilaniyla (0) DB varsayilani ayni olsun diye Ocean. DB'de metin saklandigi icin sira degisikligi guvenli.
    Ocean,
    Forest,
    Midnight,
    Coral,
    Plum,
    Graphite
}

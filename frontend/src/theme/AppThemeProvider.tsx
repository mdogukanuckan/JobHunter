import { CssBaseline, ThemeProvider } from '@mui/material';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { tokenStore } from '../api/client';
import { settingsApi } from '../api/settings';
import type { AppearanceSettings } from '../api/types';
import { createAppTheme } from './createAppTheme';
import {
  DEFAULT_MODE,
  DEFAULT_PALETTE,
  PALETTE_IDS,
  PALETTES,
  THEME_MODES,
  type ColorScheme,
} from './palettes';

/*
 * Tema yonetimi.
 *  - Tercih (palet + mod) hesapta saklanir: login/refresh cevabindaki "appearance" ile gelir (AuthContext uygular).
 *  - Ayrica localStorage'a da yazilir: sayfa acilirken oturum yuklenene kadar dogru renklerle cizilsin,
 *    ekran bir an baska renkte yanip sonmesin. (Bu sadece onbellek; asil kaynak backend.)
 *  - "System" modunda isletim sisteminin acik/koyu ayari canli takip edilir.
 */

const STORAGE_KEY = 'jh_appearance';

interface AppThemeContextValue {
  appearance: AppearanceSettings;
  /** Su an gercekte uygulanan sema (System secildiyse isletim sistemine gore). */
  scheme: ColorScheme;
  /** Kullanici degistirdi: hemen uygular, localStorage'a ve (giris yapilmissa) hesaba yazar. */
  setAppearance: (next: Partial<AppearanceSettings>) => Promise<void>;
  /** Sunucudan gelen tercihi uygular (kaydetmeden). AuthContext login/refresh sonrasi cagirir. */
  applyServerAppearance: (appearance: AppearanceSettings) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function isValid(a: unknown): a is AppearanceSettings {
  const v = a as AppearanceSettings | null;
  return !!v && (PALETTE_IDS as readonly string[]).includes(v.palette) && (THEME_MODES as readonly string[]).includes(v.mode);
}

function readStored(): AppearanceSettings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (isValid(parsed)) return parsed;
  } catch {
    // localStorage kapali (gizli pencere vb.) ya da bozuk veri: varsayilana don.
  }
  return { palette: DEFAULT_PALETTE, mode: DEFAULT_MODE };
}

function writeStored(a: AppearanceSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    // yazilamazsa sorun degil; tercih yine hesapta saklaniyor.
  }
}

/** Isletim sisteminin koyu mod tercihini canli takip eder. */
function useSystemPrefersDark(): boolean {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return dark;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<AppearanceSettings>(readStored);
  const systemDark = useSystemPrefersDark();

  const scheme: ColorScheme = appearance.mode === 'System' ? (systemDark ? 'dark' : 'light') : appearance.mode === 'Dark' ? 'dark' : 'light';
  const theme = useMemo(() => createAppTheme(appearance.palette, scheme), [appearance.palette, scheme]);

  // Tarayici/telefon ust cubugu (PWA'da da) ve form kontrolleri temaya uysun.
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETTES[appearance.palette][scheme].surface);
    document.documentElement.style.colorScheme = scheme;
    document.documentElement.style.background = PALETTES[appearance.palette][scheme].bg; // index.html'deki erken boyamayi gunceller
  }, [appearance.palette, scheme]);

  const applyServerAppearance = useCallback((a: AppearanceSettings) => {
    if (!isValid(a)) return;
    setAppearanceState(a);
    writeStored(a);
  }, []);

  const setAppearance = useCallback(
    async (next: Partial<AppearanceSettings>) => {
      const previous = appearance;
      const merged = { ...appearance, ...next };
      setAppearanceState(merged);
      writeStored(merged);
      if (!tokenStore.get()) return; // giris yapilmamis (login sayfasi): sadece bu tarayicida kalir
      try {
        await settingsApi.updateAppearance(merged);
      } catch (err) {
        // Kaydedilemediyse eski haline don ki ekran ile hesap tutarsiz kalmasin.
        setAppearanceState(previous);
        writeStored(previous);
        throw err;
      }
    },
    [appearance],
  );

  const value = useMemo(
    () => ({ appearance, scheme, setAppearance, applyServerAppearance }),
    [appearance, scheme, setAppearance, applyServerAppearance],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme, AppThemeProvider icinde kullanilmali.');
  return ctx;
}

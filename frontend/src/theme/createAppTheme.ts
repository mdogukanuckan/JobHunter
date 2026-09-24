import { alpha, createTheme, type Theme } from '@mui/material/styles';
import type { ApplicationStatus } from '../api/types';
import { PALETTES, STATUS_COLORS_BY_SCHEME, type ColorScheme, type PaletteId } from './palettes';

// MUI'nin Palette tipine kendi alanlarimizi ekliyoruz (TypeScript "module augmentation").
// Boylece bilesenlerde sx={{ bgcolor: 'app.surface2' }} veya theme.palette.app.accentSoft yazilabilir.
declare module '@mui/material/styles' {
  interface Palette {
    app: import('./palettes').AppTokens;
    status: Record<ApplicationStatus, string>;
  }
  interface PaletteOptions {
    app?: import('./palettes').AppTokens;
    status?: Record<ApplicationStatus, string>;
  }
}

export const APP_BAR_HEIGHT = 68;
export const FONT_FAMILY = '"Manrope", "Segoe UI", system-ui, sans-serif';

/** Secili palet + acik/koyu moddan MUI temasi uretir. */
export function createAppTheme(paletteId: PaletteId, scheme: ColorScheme): Theme {
  const c = PALETTES[paletteId][scheme];

  return createTheme({
    palette: {
      mode: scheme,
      primary: { main: c.accent, contrastText: c.onAccent },
      secondary: { main: c.accentText },
      background: { default: c.bg, paper: c.surface },
      text: { primary: c.text, secondary: c.muted },
      divider: c.border,
      app: c,
      status: STATUS_COLORS_BY_SCHEME[scheme],
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: FONT_FAMILY,
      h4: { fontWeight: 800, letterSpacing: '-0.03em' },
      h5: { fontWeight: 800, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
      overline: { fontWeight: 800, letterSpacing: '0.06em' },
    },
    mixins: { toolbar: { minHeight: APP_BAR_HEIGHT } },
    components: {
      MuiCssBaseline: {
        styleOverrides: { body: { backgroundColor: c.bg, colorScheme: scheme } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 999, paddingInline: 18 }, sizeSmall: { paddingInline: 12 } },
      },
      // Govdedeki kartlar (Paper) golgesiz, ince kenarlikli ve yumusak golgeli: B tasarimindaki kart gorunumu.
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: 'none', border: `1px solid ${c.border}` } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: { root: { backgroundColor: c.surface, color: c.text, borderBottom: `1px solid ${c.border}` } },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
      MuiMenu: { styleOverrides: { paper: { borderRadius: 14, border: `1px solid ${c.border}` } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700, minHeight: 44 } } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 }, notchedOutline: { borderColor: c.border } } },
      MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
      MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8, fontWeight: 600 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 14 } } },
      MuiListItemButton: {
        styleOverrides: { root: { '&.Mui-selected': { backgroundColor: c.accentSoft, color: c.accentText } } },
      },
      MuiBottomNavigation: { styleOverrides: { root: { backgroundColor: c.surface, height: 64 } } },
      MuiBottomNavigationAction: {
        styleOverrides: { root: { color: c.muted, minWidth: 0, '&.Mui-selected': { color: c.accent } } },
      },
      MuiBadge: { styleOverrides: { colorError: { backgroundColor: c.badge } } },
      MuiLinearProgress: { styleOverrides: { root: { backgroundColor: alpha(c.accent, 0.15) } } },
    },
  });
}

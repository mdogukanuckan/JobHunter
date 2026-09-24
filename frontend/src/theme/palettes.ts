import type { ApplicationStatus } from '../api/types';

/*
 * Renk paletleri. Her palet acik ve koyu mod icin ayni "token" (rol) setini tanimlar;
 * bilesenler renk kodu degil rol kullanir (orn. surface2, accentSoft). Boylece palet degisince
 * tum uygulama tek yerden degisir. Tasarim tuvalindeki "B paletleri" ile ayni degerler.
 */

export const PALETTE_IDS = ['Forest', 'Midnight', 'Coral', 'Plum', 'Graphite', 'Ocean'] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const THEME_MODES = ['System', 'Light', 'Dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export type ColorScheme = 'light' | 'dark';

export interface AppTokens {
  bg: string; // sayfa zemini
  surface: string; // kart, ust bar, dialog
  surface2: string; // ikincil zemin (menu kapsulu, cip, ikon butonu)
  border: string;
  text: string;
  muted: string; // ikincil metin
  accent: string; // ana vurgu (buton, aktif oge)
  accentSoft: string; // vurgunun acik zemini (etiket, secili satir)
  accentText: string; // accentSoft uzerindeki metin
  onAccent: string; // accent uzerindeki metin
  pill: string; // menude aktif sekmenin zemini
  badge: string; // bildirim rozeti
  shadow: string;
}

const D = '0 1px 2px rgba(0,0,0,.35)';
const L = (r: number, g: number, b: number) => `0 1px 2px rgba(${r},${g},${b},.05), 0 6px 20px rgba(${r},${g},${b},.06)`;

export const PALETTES: Record<PaletteId, Record<ColorScheme, AppTokens>> = {
  Forest: {
    light: { bg: '#f4f6f2', surface: '#ffffff', surface2: '#e9eee5', border: '#dfe6d9', text: '#17231a', muted: '#5c6b5e', accent: '#2f7d4f', accentSoft: '#e0efe4', accentText: '#22603b', onAccent: '#ffffff', pill: '#ffffff', badge: '#e5484d', shadow: L(23, 35, 26) },
    dark: { bg: '#0f1510', surface: '#172019', surface2: '#121a14', border: '#26332a', text: '#e7f0e8', muted: '#9aab9d', accent: '#5cc387', accentSoft: '#1b3525', accentText: '#a5e6bf', onAccent: '#0b2415', pill: '#22302a', badge: '#f2555a', shadow: D },
  },
  Midnight: {
    light: { bg: '#f3f5fb', surface: '#ffffff', surface2: '#e9edf7', border: '#dfe4f1', text: '#121a33', muted: '#58627f', accent: '#3b5bdb', accentSoft: '#e3e9fc', accentText: '#2f49b5', onAccent: '#ffffff', pill: '#ffffff', badge: '#e5484d', shadow: L(18, 26, 51) },
    dark: { bg: '#0d1120', surface: '#151b2e', surface2: '#10162a', border: '#252d47', text: '#e8ecf8', muted: '#97a0bf', accent: '#7c95f7', accentSoft: '#1f2a52', accentText: '#b9c7ff', onAccent: '#0b1230', pill: '#222a45', badge: '#f2555a', shadow: D },
  },
  Coral: {
    light: { bg: '#fbf6f4', surface: '#ffffff', surface2: '#f4ebe7', border: '#eee0da', text: '#2b1a16', muted: '#76605a', accent: '#cf4430', accentSoft: '#fde6e0', accentText: '#a8361f', onAccent: '#ffffff', pill: '#ffffff', badge: '#c0262d', shadow: L(43, 26, 22) },
    dark: { bg: '#171010', surface: '#221817', surface2: '#1c1413', border: '#382825', text: '#f6ebe8', muted: '#b9a19b', accent: '#ff7a62', accentSoft: '#3f211b', accentText: '#ffb9a9', onAccent: '#2b0d07', pill: '#2e2120', badge: '#f2555a', shadow: D },
  },
  Plum: {
    light: { bg: '#f8f4f7', surface: '#ffffff', surface2: '#f0e8ee', border: '#e8dce5', text: '#261422', muted: '#6e5a69', accent: '#a3367a', accentSoft: '#f6e2ef', accentText: '#85285f', onAccent: '#ffffff', pill: '#ffffff', badge: '#e5484d', shadow: L(38, 20, 34) },
    dark: { bg: '#150e14', surface: '#20161e', surface2: '#1a1219', border: '#372834', text: '#f5eaf2', muted: '#b49fae', accent: '#e17ab8', accentSoft: '#3b1f33', accentText: '#f5b8dc', onAccent: '#2a0b1e', pill: '#2c1f29', badge: '#f2555a', shadow: D },
  },
  Graphite: {
    light: { bg: '#f4f4f2', surface: '#ffffff', surface2: '#eaeae6', border: '#e0e0da', text: '#18181b', muted: '#5f5f66', accent: '#18181b', accentSoft: '#eef9c8', accentText: '#4d6310', onAccent: '#d9f75a', pill: '#ffffff', badge: '#e5484d', shadow: L(24, 24, 27) },
    dark: { bg: '#0f0f11', surface: '#19191c', surface2: '#141416', border: '#2a2a2e', text: '#f1f1ee', muted: '#a0a0a8', accent: '#d4f54a', accentSoft: '#2c3312', accentText: '#dcf77a', onAccent: '#16180a', pill: '#26262a', badge: '#f2555a', shadow: D },
  },
  Ocean: {
    light: { bg: '#f2f6f7', surface: '#ffffff', surface2: '#e8eff1', border: '#dde7ea', text: '#0f2429', muted: '#56707a', accent: '#0e8a81', accentSoft: '#dcf2ef', accentText: '#0a6a63', onAccent: '#ffffff', pill: '#ffffff', badge: '#e5484d', shadow: L(15, 36, 41) },
    dark: { bg: '#0c1618', surface: '#13211f', surface2: '#0f1c1d', border: '#223533', text: '#e5f1ef', muted: '#8fa9a6', accent: '#2cc2b3', accentSoft: '#143834', accentText: '#86e3d8', onAccent: '#06201d', pill: '#1d302e', badge: '#f2555a', shadow: D },
  },
};

/** Kanban durum renkleri: palete gore degismez (anlami sabit kalsin), sadece koyu modda acilir. */
export const STATUS_COLORS_BY_SCHEME: Record<ColorScheme, Record<ApplicationStatus, string>> = {
  light: { Wishlist: '#64748b', Applied: '#2563eb', Interview: '#d97706', Offer: '#16a34a', Rejected: '#dc2626', Withdrawn: '#9ca3af' },
  dark: { Wishlist: '#94a3b8', Applied: '#60a5fa', Interview: '#fbbf24', Offer: '#4ade80', Rejected: '#f87171', Withdrawn: '#6b7280' },
};

export const DEFAULT_PALETTE: PaletteId = 'Forest';
export const DEFAULT_MODE: ThemeMode = 'System';

import { APPLICATION_STATUSES, type ApplicationStatus, type JobApplicationSummary } from '../../api/types';

/*
 * Durum renkleri artik temada: theme.palette.status (koyu modda otomatik acilir).
 * sx icinde dogrudan yol olarak kullanilir: bgcolor: `status.${status}`.
 */

const AVATAR_COLORS = {
  light: [['#e0e7ff', '#3730a3'], ['#dcfce7', '#166534'], ['#fef3c7', '#92400e'], ['#fce7f3', '#9d174d'], ['#e0f2fe', '#075985'], ['#ede9fe', '#5b21b6']],
  dark: [['#312e81', '#c7d2fe'], ['#14532d', '#bbf7d0'], ['#78350f', '#fde68a'], ['#831843', '#fbcfe8'], ['#0c4a6e', '#bae6fd'], ['#4c1d95', '#ddd6fe']],
} as const;

/** Sirket adindan sabit bir avatar rengi: ayni sirket her yerde ayni renkte gorunur. */
export function avatarColors(name: string, scheme: 'light' | 'dark'): { bg: string; fg: string } {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const [bg, fg] = AVATAR_COLORS[scheme][Math.abs(hash) % AVATAR_COLORS[scheme].length]!;
  return { bg, fg };
}

/** Pano durumu: sutun (status) -> o sutundaki kartlar (yukaridan asagi sirali). */
export type BoardColumns = Record<ApplicationStatus, JobApplicationSummary[]>;

export function isStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

/** Backend'den gelen duz listeyi sutunlara ayirir. */
export function groupByStatus(items: JobApplicationSummary[]): BoardColumns {
  const columns = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, [] as JobApplicationSummary[]])) as BoardColumns;
  for (const item of items) columns[item.status].push(item);
  for (const status of APPLICATION_STATUSES) columns[status].sort((a, b) => a.position - b.position);
  return columns;
}

/**
 * Sutunlari tekrar duz listeye cevirir; status ve position alanlarini kartin gercek yerine gore yeniden yazar.
 * Suruklemeden sonra cache'i "backend ne yapacaksa o" haliyle guncellemek (optimistic update) icin kullanilir.
 */
export function flattenColumns(columns: BoardColumns): JobApplicationSummary[] {
  return APPLICATION_STATUSES.flatMap((status) =>
    columns[status].map((item, index) => ({ ...item, status, position: index })),
  );
}

/** id bir sutun id'si (status) ise onu, kart id'si ise kartin bulundugu sutunu dondurur. */
export function findColumn(columns: BoardColumns, id: string): ApplicationStatus | null {
  if (isStatus(id)) return id;
  return APPLICATION_STATUSES.find((s) => columns[s].some((item) => item.id === id)) ?? null;
}

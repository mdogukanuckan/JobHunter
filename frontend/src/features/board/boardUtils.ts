import { APPLICATION_STATUSES, type ApplicationStatus, type JobApplicationSummary } from '../../api/types';

/** Her sutunun rengi (baslik noktasi ve kart sol kenari). */
export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Wishlist: '#64748b',
  Applied: '#2563eb',
  Interview: '#d97706',
  Offer: '#16a34a',
  Rejected: '#dc2626',
  Withdrawn: '#9ca3af',
};

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

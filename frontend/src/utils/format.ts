/** Tarihleri secili arayuz diline gore bicimlendirir (tr: 23 Eyl 2026, en: Sep 23, 2026). */
export function formatDate(iso: string | null | undefined, lng: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(lng, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined, lng: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(lng, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Bos/sadece bosluk olan metni null'a cevirir (backend'e "" yerine null gitsin). */
export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Saat (orn. 14:30), secili dilde. */
export function formatTime(iso: string, lng: string): string {
  return new Intl.DateTimeFormat(lng, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * ISO (UTC) -> <input type="datetime-local"> degeri ("2026-10-01T14:30"), kullanicinin yerel saatiyle.
 * datetime-local saat dilimi bilgisi tasimaz; bu yuzden donusum tarayicinin saat diliminde yapilir.
 */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> degeri -> UTC ISO ("...Z"). Backend DateTimeOffset olarak alip UTC saklar. */
export function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

/** Yerel takvim gunu anahtari ("2026-10-01"): gunlere gore gruplamak icin. */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

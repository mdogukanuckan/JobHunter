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

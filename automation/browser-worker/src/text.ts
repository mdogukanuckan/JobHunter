// Metin karsilastirma yardimcilari: Turkce karakterler, buyuk/kucuk harf, noktalama farklarini yok sayar.

const TR_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/** "Yaşadığınız Şehir?" → "yasadiginiz sehir" */
export function norm(s: string | null | undefined): string {
  return (s ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]|i̇/g, (c) => TR_MAP[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOP = new Set([
  've', 'ile', 'mi', 'mu', 'misiniz', 'musunuz', 'bu', 'bir', 'icin', 'nedir', 'nelerdir', 'kac', 'ne', 'neden',
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'you', 'your', 'are', 'do', 'is', 'in', 'for', 'what', 'how', 'why',
]);

export function tokens(s: string): Set<string> {
  return new Set(norm(s).split(' ').filter((t) => t.length > 1 && !STOP.has(t)));
}

/**
 * Iki soru ne kadar benziyor (0..1). Kelime ortusmesi (Dice katsayisi); Turkce eklerle bas etmek icin
 * kelimelerin ilk 5 harfi karsilastirilir ("calistiniz" ~ "calisma").
 */
export function similarity(a: string, b: string): number {
  const stem = (set: Set<string>) => new Set([...set].map((t) => t.slice(0, 5)));
  const ta = stem(tokens(a));
  const tb = stem(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return (2 * common) / (ta.size + tb.size);
}

/** Cevap metnine en uygun secenek: birebir, sonra "Evet, ..." gibi baslangic, sonra icerme. */
export function pickOption(options: string[], answer: string): string | null {
  const a = norm(answer);
  if (!a) return null;
  const opts = options.map((o) => ({ o, n: norm(o) })).filter((x) => x.n);
  return (
    opts.find((x) => x.n === a)?.o ??
    opts.find((x) => a.startsWith(x.n + ' '))?.o ??
    opts.find((x) => x.n.includes(a) || a.includes(x.n))?.o ??
    null
  );
}

// Faz 10a: KURAL TABANLI eslestirme. "Bu form alani profildeki hangi bilgi?" sorusunu
// etiket/name/autocomplete uzerinden anahtar kelimelerle cevaplar. Faz 10b'de bu dosyanin yerini
// (ya da onundeki adimi) Claude API alacak; digerleri (form okuma, doldurma, raporlama) ayni kalacak.
//
// Gizlilik (Faz 5b politikalari) burada uygulanir:
//   Auto     → doldurulur
//   AskFirst → DOLDURULMAZ, "once sorulmali" diye raporlanir (Faz 11 onay ekrani soracak)
//   Never    → DOLDURULMAZ (paket zaten degeri icermez)

import type { FormField } from './form.js';
import { norm, pickOption, similarity } from './text.js';
import type { Payload, PolicyField } from './types.js';

export type Resolution =
  | { kind: 'fill'; value: string | boolean | 'CV'; source: string; note?: string }
  | { kind: 'skip'; reason: string; askFirst?: boolean };

const fill = (value: string | boolean | 'CV', source: string, note?: string): Resolution => ({ kind: 'fill', value, source, note });
const skip = (reason: string, askFirst = false): Resolution => ({ kind: 'skip', reason, askFirst });

/**
 * Bir kural: "text" = etiket + ipuclari (normalize edilmis). match true ise resolve cagrilir.
 * resolve'un dondurdugu 'want' secenekli alanlarda (select/radio) seceneklere cevrilir.
 */
interface Rule {
  id: string;
  match: (text: string, f: FormField) => boolean;
  resolve: (p: Payload, f: FormField) => Want;
}

/** Istenen deger: tek metin, esanlamli adaylar listesi (ilk eslesen secilir) ya da hazir sonuc. */
type Want = string | string[] | Resolution | null | undefined;

const has = (text: string, re: RegExp) => re.test(text);
const isChoice = (f: FormField) => f.type === 'select' || f.type === 'radio';

/** Politikali alan: Auto degilse ya da deger yoksa uygun "skip" sonucunu doner. */
function policy<T>(p: Payload, key: string, label: string, map: (v: T) => Want): Want {
  const pf = p.policyFields?.[key] as PolicyField<T> | undefined;
  if (!pf) return skip(`${label}: pakette yok`);
  if (pf.policy === 'Never') return skip(`${label}: "asla doldurma" (Never)`);
  if (pf.policy === 'AskFirst') return skip(`${label}: önce sorulmalı (AskFirst)`, true);
  if (pf.value === null || pf.value === undefined) return skip(`${label}: profilde girilmemiş`);
  return map(pf.value);
}

const noticeDays = (optionLabel: string): number => {
  const t = norm(optionLabel);
  if (/hemen|immediate|asap/.test(t)) return 0;
  if (/uzun|fazla|more|over|longer/.test(t)) return Number.POSITIVE_INFINITY;
  const m = /(\d+)\s*(gun|day|hafta|week|ay|month)/.exec(t);
  if (!m) return Number.NaN;
  const n = Number(m[1]);
  const unit = m[2]!;
  return unit.startsWith('h') || unit.startsWith('w') ? n * 7 : unit === 'ay' || unit.startsWith('mo') ? n * 30 : n;
};

const LEVEL_WORDS: Record<string, string[]> = {
  A1: ['a1', 'baslangic', 'beginner', 'temel'],
  A2: ['a2', 'baslangic', 'elementary', 'temel'],
  B1: ['b1', 'orta', 'intermediate'],
  B2: ['b2', 'iyi', 'upper intermediate', 'orta'],
  C1: ['c1', 'ileri', 'advanced'],
  C2: ['c2', 'cok iyi', 'proficient', 'ileri'],
  Native: ['anadil', 'native', 'c2'],
};

const RULES: Rule[] = [
  // ---- Temel bilgiler (politikasiz) ----
  {
    id: 'email',
    match: (t, f) => f.type === 'email' || has(t, /\b(e ?posta|email|e mail)\b/),
    resolve: (p) => p.candidate.email,
  },
  {
    id: 'phone',
    match: (t, f) => f.type === 'tel' || has(t, /\b(telefon|phone|gsm|cep|mobile)\b/),
    resolve: (p) => p.candidate.phoneNumber ?? skip('Telefon: profilde girilmemiş'),
  },
  {
    id: 'fullName',
    match: (t) => has(t, /\b(ad soyad|adiniz soyadiniz|isim soyisim|full ?name|name surname)\b/) || /\bname\b/.test(t) && !/(first|last|given|family|company|sirket|user)/.test(t),
    resolve: (p) => p.candidate.fullName,
  },
  {
    id: 'lastName',
    match: (t) => has(t, /\b(soyad|soyadi|soyadiniz|soyisim|last ?name|surname|family ?name)\b/),
    resolve: (p) => p.candidate.lastName ?? skip('Soyad ayrıştırılamadı'),
  },
  {
    id: 'firstName',
    match: (t) =>
      has(t, /\b(ad|adi|adiniz|isim|first ?name|given ?name)\b/) && !has(t, /(sirket|firma|okul|universite|kurum|company|school|kullanici|user)/),
    resolve: (p) => p.candidate.firstName ?? p.candidate.fullName,
  },
  {
    id: 'linkedin',
    match: (t) => has(t, /linkedin/),
    resolve: (p) => p.candidate.linkedInUrl ?? skip('LinkedIn: profilde girilmemiş'),
  },
  {
    id: 'github',
    match: (t) => has(t, /github|gitlab/),
    resolve: (p) => p.candidate.gitHubUrl ?? p.candidate.portfolioUrl ?? skip('GitHub/portföy: profilde girilmemiş'),
  },
  {
    id: 'portfolio',
    match: (t) => has(t, /\b(portfoy|portfolio|web ?sitesi|website|kisisel site)\b/),
    resolve: (p) => p.candidate.portfolioUrl ?? p.candidate.gitHubUrl ?? skip('Portföy: profilde girilmemiş'),
  },
  {
    id: 'yearsExperience',
    match: (t, f) => (f.type === 'number' || f.type === 'text' || isChoice(f)) && has(t, /(yil.*deneyim|deneyim.*yil|tecrube.*yil|years.*experience|experience.*years)/),
    resolve: (p) => (p.candidate.yearsOfExperience ?? null) !== null ? String(p.candidate.yearsOfExperience) : skip('Deneyim yılı: profilde girilmemiş'),
  },
  {
    id: 'noticePeriod',
    match: (t) => has(t, /(ne zaman.*basla|baslayabilir|ise baslama|baslama tarihi|ihbar|notice|when can you start|start date|available)/),
    resolve: (p, f) => {
      const days = p.candidate.noticePeriodDays;
      if (days === null || days === undefined) return skip('İşe başlama süresi: profilde girilmemiş');
      if (!isChoice(f)) return f.type === 'number' ? String(days) : days === 0 ? 'Hemen' : `${days} gün`;
      // Ihbar suresini karsilayan en kisa secenek ("2 hafta icinde" = 14 gun ...).
      const best = f.options
        .map((o) => ({ o, d: noticeDays(o.label) }))
        .filter((x) => !Number.isNaN(x.d) && x.d >= days)
        .sort((a, b) => a.d - b.d)[0];
      return best?.o.label ?? skip(`İşe başlama: ${days} gün hiçbir seçeneğe uymadı`);
    },
  },
  {
    id: 'english',
    match: (t, f) => isChoice(f) && has(t, /\b(ingilizce|english)\b/),
    resolve: (p) => {
      const lang = p.languages.find((l) => /^(ingilizce|english|en)$/.test(norm(l.name)));
      return lang ? LEVEL_WORDS[lang.level] : skip('İngilizce: profilde dil kaydı yok');
    },
  },
  {
    id: 'city',
    match: (t) => has(t, /\b(sehir|yasadiginiz il|ikamet|city|address level2)\b/),
    resolve: (p) =>
      p.candidate.city ??
      policy<{ city: string | null }>(p, 'address', 'Adres', (a) => a.city ?? skip('Şehir: profilde girilmemiş')),
  },

  // ---- Politikali alanlar ----
  {
    id: 'dateOfBirth',
    match: (t) => has(t, /(dogum tarihi|birth ?date|date of birth|bday)/),
    resolve: (p) => policy<string>(p, 'dateOfBirth', 'Doğum tarihi', (v) => String(v).slice(0, 10)),
  },
  {
    id: 'gender',
    match: (t) => has(t, /\b(cinsiyet|gender|sex)\b/),
    resolve: (p) =>
      policy<string>(p, 'gender', 'Cinsiyet', (v) =>
        ({ Female: ['kadin', 'female'], Male: ['erkek', 'male'], Other: ['diger', 'other'], PreferNotToSay: ['belirtmek istemiyorum', 'prefer not'] })[v] ?? [v],
      ),
  },
  {
    id: 'military',
    match: (t) => has(t, /\b(askerlik|military)\b/),
    resolve: (p) =>
      policy<{ status: string }>(p, 'militaryService', 'Askerlik', (v) =>
        ({
          Completed: ['yapildi', 'tamamlandi', 'completed', 'done'],
          Exempt: ['muaf', 'exempt'],
          Postponed: ['tecilli', 'tecil', 'postponed'],
          NotCompleted: ['yapilmadi', 'not completed'],
          NotApplicable: ['yukumlu degil', 'muhatap degil', 'not applicable'],
        })[v.status] ?? [v.status],
      ),
  },
  {
    id: 'driverLicense',
    match: (t) => has(t, /(surucu belgesi|ehliyet|driver)/),
    resolve: (p, f) =>
      policy<{ classes: string[] }>(p, 'driverLicense', 'Sürücü belgesi', (v) => {
        const classes = v.classes.map((c) => c.toUpperCase());
        if (!isChoice(f)) return classes.join(', ');
        const higher = classes.some((c) => /^(C|C1|CE|D|D1|DE|E)$/.test(c));
        const want: string[] = [];
        if (higher) want.push('b ve uzeri', 'b and above');
        want.push(...classes, classes.length ? 'var' : 'yok');
        return want;
      }),
  },
  {
    id: 'expectedSalary',
    match: (t) => has(t, /(maas|ucret beklenti|salary|compensation)/),
    resolve: (p) => policy<{ amount: number }>(p, 'expectedSalary', 'Maaş beklentisi', (v) => String(Math.round(v.amount))),
  },
  {
    id: 'nationality',
    match: (t) => has(t, /\b(uyruk|uyrugunuz|nationality|citizenship)\b/),
    resolve: (p) => policy<string>(p, 'nationality', 'Uyruk', (v) => v),
  },
  {
    id: 'maritalStatus',
    match: (t) => has(t, /(medeni|marital)/),
    resolve: (p) =>
      policy<string>(p, 'maritalStatus', 'Medeni durum', (v) =>
        ({ Single: ['bekar', 'single'], Married: ['evli', 'married'], Divorced: ['bosanmis', 'divorced'], Widowed: ['dul', 'widowed'], PreferNotToSay: ['belirtmek istemiyorum', 'prefer not'] })[v] ?? [v],
      ),
  },
  {
    id: 'smoking',
    match: (t, f) => isChoice(f) && has(t, /(sigara|smok)/),
    resolve: (p) => policy<boolean>(p, 'smoking', 'Sigara', (v) => (v ? ['evet', 'yes', 'kullaniyorum'] : ['hayir', 'no', 'kullanmiyorum'])),
  },
  {
    id: 'travel',
    match: (t, f) => isChoice(f) && has(t, /(seyahat|travel)/),
    resolve: (p) => policy<boolean>(p, 'travel', 'Seyahat', (v) => (v ? ['evet', 'yes'] : ['hayir', 'no'])),
  },
  {
    id: 'disability',
    match: (t, f) => isChoice(f) && has(t, /(engel|disab)/),
    resolve: (p) => policy<boolean>(p, 'disability', 'Engellilik', (v) => (v ? ['evet', 'var', 'yes'] : ['hayir', 'yok', 'no'])),
  },
  {
    id: 'nationalId',
    match: (t) => has(t, /(tc kimlik|kimlik no|t c no|tckn|national id)/),
    // Faz 5b karari: TC kimlik no sistemde hic tutulmaz; onay adiminda kullanicidan istenir.
    resolve: () => skip('TC kimlik no: sistemde tutulmuyor, onay adımında sorulacak', true),
  },
];

/** KVKK / aydinlatma metni / gizlilik onay kutulari. */
const CONSENT_RE = /(kvkk|aydinlatma|kisisel veri|privacy|gizlilik|consent|onayliyorum|kabul ediyorum|i agree)/;

/** Secenekli alanda istenen degerlerden (ilk eslesen) gercek secenek etiketini bulur. */
function toOption(f: FormField, want: string | string[]): string | null {
  const wants = Array.isArray(want) ? want : [want];
  for (const w of wants) {
    const hit = pickOption(f.options.map((o) => o.label), w);
    if (hit) return hit;
  }
  return null;
}

/** Hazir cevap bankasi (Faz 5): soru metni form etiketine yeterince benziyorsa cevabi kullanir. */
function fromScreening(p: Payload, f: FormField, minScore = 0.5): Resolution | null {
  let best: { q: Payload['screeningAnswers'][number]; s: number } | null = null;
  for (const q of p.screeningAnswers ?? []) {
    const s = similarity(q.question, f.label);
    if (s >= minScore && (!best || s > best.s)) best = { q, s };
  }
  if (!best) return null;
  const source = `hazır cevap: "${best.q.question}" (benzerlik %${Math.round(best.s * 100)})`;
  if (isChoice(f)) {
    const opt = toOption(f, best.q.answer);
    return opt ? fill(opt, source) : skip(`Hazır cevap seçeneklere uymadı: "${best.q.answer}"`);
  }
  if (f.type === 'checkbox') return null;
  return fill(best.q.answer, source);
}

/** Ek bilgiler (label-value) listesi: etiket benzerse deger, politikasina uyarak. */
function fromCustomFields(p: Payload, f: FormField): Resolution | null {
  let best: { c: Payload['customFields'][number]; s: number } | null = null;
  for (const c of p.customFields ?? []) {
    const s = similarity(c.label, f.label);
    if (s >= 0.6 && (!best || s > best.s)) best = { c, s };
  }
  if (!best) return null;
  if (best.c.policy === 'AskFirst') return skip(`Ek bilgi "${best.c.label}": önce sorulmalı (AskFirst)`, true);
  if (isChoice(f)) {
    const opt = toOption(f, best.c.value);
    return opt ? fill(opt, `ek bilgi: ${best.c.label}`) : null;
  }
  return fill(best.c.value, `ek bilgi: ${best.c.label}`);
}

/** Bir form alani icin karar: ne yazilacak (ve nereden) ya da neden bos birakilacak. */
export function resolveField(p: Payload, f: FormField): Resolution {
  const text = norm(`${f.label} ${f.hints}`);

  if (f.type === 'file') {
    if (!/(cv|ozgecmis|resume|curriculum)/.test(text) && f.required === false) return skip('Dosya alanı CV gibi görünmüyor');
    return p.cv ? fill('CV', `CV: ${p.cv.name}`) : skip('CV yok (başvuruda ve profilde seçilmemiş)');
  }

  if (f.type === 'checkbox') {
    if (CONSENT_RE.test(text)) {
      return fill(true, 'onay kutusu', 'KVKK / aydınlatma metni onayı işaretlendi');
    }
    const sa = fromScreening(p, f);
    return sa ?? skip('Onay kutusu: ne olduğu anlaşılamadı');
  }

  // Ozgur metin sorulari (on yazi, "neden biz?") once hazir cevap bankasindan.
  if (f.type === 'textarea') {
    const sa = fromScreening(p, f, 0.45);
    if (sa) return sa;
    if (/(on yazi|cover letter|motivasyon)/.test(text)) {
      const tagged = (p.screeningAnswers ?? []).find((q) => q.tags.some((t) => /(on yazi|cover letter|cover)/.test(norm(t))));
      return tagged ? fill(tagged.answer, `hazır cevap (etiket): "${tagged.question}"`) : skip('Ön yazı: hazır cevaplarda yok');
    }
  }

  for (const rule of RULES) {
    if (!rule.match(text, f)) continue;
    const want = rule.resolve(p, f);
    if (want === null || want === undefined) continue;
    if (typeof want === 'object' && !Array.isArray(want)) return want; // hazir Resolution (skip)
    if (isChoice(f)) {
      const opt = toOption(f, want);
      return opt ? fill(opt, `kural: ${rule.id}`) : skip(`${rule.id}: değer seçeneklere uymadı (${[want].flat().join(' / ')})`);
    }
    return fill(Array.isArray(want) ? want[0]! : want, `kural: ${rule.id}`);
  }

  return fromCustomFields(p, f) ?? fromScreening(p, f) ?? skip('Profilde karşılığı bulunamadı');
}

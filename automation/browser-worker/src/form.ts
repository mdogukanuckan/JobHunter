// Sayfadaki formu "okur" (alanlar, etiketler, butonlar) ve alanlari doldurur.
// Siteye ozel kod yok: etiket/name/autocomplete gibi genel HTML bilgileriyle calisir.

import type { Page } from 'playwright';

export type FieldType =
  | 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'textarea'
  | 'select' | 'radio' | 'checkbox' | 'file';

export interface FormOption {
  label: string;
  value: string;
}

export interface FormField {
  /** Playwright icin CSS secici (radio grubunda gruptaki tum input'lar). */
  selector: string;
  name: string;
  type: FieldType;
  label: string;
  /** Eslestirmede kullanilan ek ipuclari: name, id, autocomplete, placeholder. */
  hints: string;
  required: boolean;
  options: FormOption[];
  /** Alanda zaten bir deger var mi (tarayici/site onceden doldurmus olabilir). */
  hasValue: boolean;
}

export interface FormSnapshot {
  found: boolean;
  fields: FormField[];
  /** Gorunur "ileri / devam" butonu (sihirbaz). */
  nextSelector: string | null;
  /** Gorunur gonder butonu. */
  submitSelector: string | null;
}

/**
 * Sayfadaki basvuru formunun SU AN GORUNEN alanlarini cikarir. Sihirbazlarda sadece aktif adim gorunur;
 * "ileri"ye basildiktan sonra tekrar cagrilir.
 * Kod tarayicinin icinde (page.evaluate) calisir; bu yuzden disaridaki degiskenleri kullanamaz.
 */
export async function readForm(page: Page): Promise<FormSnapshot> {
  return page.evaluate(() => {
    const visible = (el: Element) =>
      (el as HTMLElement).checkVisibility?.({ checkVisibilityCSS: true }) ?? (el as HTMLElement).offsetParent !== null;
    const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').replace(/\*/g, '').trim();
    const esc = (s: string) => CSS.escape(s);

    const controlsOf = (root: ParentNode) =>
      Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')).filter(
        (el) => !['hidden', 'submit', 'button', 'reset', 'image', 'search'].includes((el as HTMLInputElement).type),
      );

    // Basvuru formu: en cok alan iceren <form>. Form etiketi yoksa tum sayfa.
    const forms = Array.from(document.querySelectorAll('form'))
      .map((f) => ({ f, n: controlsOf(f).length }))
      .filter((x) => x.n >= 2)
      .sort((a, b) => b.n - a.n);
    const root: ParentNode | null = forms[0]?.f ?? (controlsOf(document).length >= 2 ? document : null);
    if (!root) return { found: false, fields: [], nextSelector: null, submitSelector: null };

    const labelOf = (el: HTMLElement): string => {
      const id = el.id;
      const byFor = id ? document.querySelector(`label[for="${esc(id)}"]`) : null;
      if (byFor) return clean(byFor.textContent);
      const wrap = el.closest('label');
      if (wrap) return clean(wrap.textContent);
      const aria = el.getAttribute('aria-label');
      if (aria) return clean(aria);
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) return clean(labelledBy.split(' ').map((x) => document.getElementById(x)?.textContent).join(' '));
      return clean(el.getAttribute('placeholder') || el.getAttribute('name') || '');
    };

    const fields: {
      selector: string; name: string; type: string; label: string; hints: string;
      required: boolean; options: { label: string; value: string }[]; hasValue: boolean;
    }[] = [];
    const seenRadio = new Set<string>();

    for (const el of controlsOf(root)) {
      if (!visible(el) || el.disabled) continue;
      const name = el.name || el.id;
      if (!name) continue;
      const tag = el.tagName.toLowerCase();
      const type = tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : (el as HTMLInputElement).type || 'text';
      const hints = [el.name, el.id, el.getAttribute('autocomplete'), el.getAttribute('placeholder')].filter(Boolean).join(' ');

      if (type === 'radio') {
        if (seenRadio.has(name)) continue;
        seenRadio.add(name);
        const group = controlsOf(root).filter((r) => (r as HTMLInputElement).type === 'radio' && r.name === el.name);
        const legend = el.closest('fieldset')?.querySelector('legend');
        fields.push({
          selector: `input[type="radio"][name="${esc(el.name)}"]`,
          name,
          type,
          label: clean(legend?.textContent) || name,
          hints,
          required: group.some((r) => r.required),
          options: group.map((r) => ({ label: clean(r.closest('label')?.textContent) || r.value, value: r.value })),
          hasValue: group.some((r) => (r as HTMLInputElement).checked),
        });
        continue;
      }

      const selector = el.name ? `${tag}[name="${esc(el.name)}"]` : `#${esc(el.id)}`;
      const options =
        tag === 'select'
          ? Array.from((el as HTMLSelectElement).options)
              .filter((o) => o.value !== '')
              .map((o) => ({ label: clean(o.textContent), value: o.value }))
          : [];
      const hasValue =
        type === 'checkbox' ? (el as HTMLInputElement).checked : type === 'file' ? ((el as HTMLInputElement).files?.length ?? 0) > 0 : el.value !== '';
      fields.push({ selector, name, type, label: labelOf(el), hints, required: el.required, options, hasValue });
    }

    // Butonlar: metnine gore "ileri" mi "gonder" mi.
    const fold = (s: string) =>
      s.toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] ?? c);
    let nextSelector: string | null = null;
    let submitSelector: string | null = null;
    const buttons = Array.from(root.querySelectorAll<HTMLElement>('button, input[type="submit"], input[type="button"]')).filter(visible);
    buttons.forEach((b, i) => {
      const text = fold(clean(b.textContent || (b as HTMLInputElement).value));
      const sel = b.id ? `#${esc(b.id)}` : `[data-jh-btn="${i}"]`;
      if (!b.id) b.setAttribute('data-jh-btn', String(i));
      const isSubmit = (b as HTMLButtonElement).type === 'submit' || /gonder|basvur|submit|apply|tamamla|finish/.test(text);
      if (isSubmit && !/devam|ileri|sonraki|next|continue/.test(text)) submitSelector ??= sel;
      else if (/devam|ileri|sonraki|next|continue/.test(text)) nextSelector ??= sel;
    });

    return { found: true, fields: fields as never, nextSelector, submitSelector };
  });
}

export interface CvFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** Tek alani doldurur. value: metin/secenek etiketi, checkbox icin true, dosya icin CvFile. */
export async function fillField(page: Page, field: FormField, value: string | boolean | CvFile): Promise<void> {
  const loc = page.locator(field.selector);
  switch (field.type) {
    case 'checkbox':
      if (value === true) await loc.check();
      else await loc.uncheck();
      return;
    case 'file':
      await loc.setInputFiles(value as CvFile);
      return;
    case 'select': {
      const opt = field.options.find((o) => o.label === value) ?? field.options.find((o) => o.value === value);
      await loc.selectOption(opt ? { value: opt.value } : { label: String(value) });
      return;
    }
    case 'radio': {
      const opt = field.options.find((o) => o.label === value) ?? field.options.find((o) => o.value === value);
      if (!opt) throw new Error(`Secenek bulunamadi: ${String(value)}`);
      await page.locator(`${field.selector}[value="${opt.value.replace(/"/g, '\\"')}"]`).check();
      return;
    }
    default:
      await loc.fill(String(value));
  }
}

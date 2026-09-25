// Bir basvuru denemesinin tarayici kismi: sayfayi ac → formu oku → eslestir → doldur → (gonder) → raporla.

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { CancelledError, rewriteLocalhost, type Reporter } from './backend.js';
import { config } from './config.js';
import { fillField, readForm, type CvFile, type FormField } from './form.js';
import { resolveField } from './mapping.js';
import type { ApplyResult, AutomationMode, FieldReport, Outcome, Payload } from './types.js';

export interface ApplyInput {
  jobId: string;
  mode: AutomationMode;
  jobUrl: string;
  payload: Payload;
  cv: CvFile | null;
  reporter: Reporter;
}

const MAX_STEPS = 10;
const CLOSED_RE = /(basvurular(i)? kapan|basvuruya kapali|ilan kapan|suresi dol|no longer accept|position (has been )?filled|closed)/;
const SUCCESS_RE = /(basvurunuz (alindi|iletildi|basariyla)|thank you for (your )?appl|application (has been )?(received|submitted))/;
const fold = (s: string) =>
  s.toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] ?? c);

/** Guvenlik kapisi: sadece izinli sunuculardaki ilanlar. */
export function checkAllowed(jobUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(jobUrl);
  } catch {
    return `Geçersiz ilan bağlantısı: ${jobUrl}`;
  }
  if (!/^https?:$/.test(u.protocol)) return `Desteklenmeyen adres: ${u.protocol}`;
  const host = u.hostname.toLowerCase();
  if (config.allowedHosts.includes('*') || config.allowedHosts.includes(host)) return null;
  return `Güvenlik: "${host}" izinli değil. Faz 12'ye kadar sadece yerel test sitesi açılır (ALLOWED_HOSTS).`;
}

export async function runApply(input: ApplyInput): Promise<ApplyResult> {
  const started = Date.now();
  const { reporter, payload, mode } = input;
  const filled: FieldReport[] = [];
  const skipped: FieldReport[] = [];
  const missingRequired: FieldReport[] = [];
  const screenshots: string[] = [];

  const finish = (outcome: Outcome, message: string, referenceNumber?: string): ApplyResult => ({
    outcome, message, referenceNumber, filled, skipped, missingRequired, screenshots, durationMs: Date.now() - started,
  });

  const blocked = checkAllowed(input.jobUrl);
  if (blocked) {
    await reporter.event('Error', 'open_page', blocked);
    return finish('Failed', blocked);
  }

  const browser = await chromium.launch({ headless: config.headless, executablePath: config.chromiumPath });
  // Genel zaman asimi: tarayiciyi kapatmak bekleyen tum Playwright cagrilarini hata ile bitirir.
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void browser.close();
  }, config.timeoutMs);

  const shot = async (page: Page, label: string) => {
    try {
      await fs.mkdir(config.screenshotDir, { recursive: true });
      const file = `${input.jobId}-${new Date().toISOString().replace(/[:.]/g, '-')}-${label}.png`;
      await page.screenshot({ path: path.join(config.screenshotDir, file), fullPage: true });
      screenshots.push(file);
      return file;
    } catch {
      return null;
    }
  };

  try {
    const context = await browser.newContext({ locale: 'tr-TR', timezoneId: 'Europe/Istanbul', viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);

    // ---- 1. Sayfayi ac ----
    const url = rewriteLocalhost(input.jobUrl);
    await reporter.event('Info', 'open_page', `İlan sayfası açılıyor: ${input.jobUrl}`);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const httpStatus = response?.status() ?? 0;
    const title = await page.title();

    let snap = await readForm(page);
    if (!snap.found || snap.fields.length === 0) {
      const text = fold(await page.locator('body').innerText().catch(() => ''));
      const file = await shot(page, 'no-form');
      if (httpStatus === 410 || CLOSED_RE.test(text)) {
        const msg = `İlan başvuruya kapalı (${title}).`;
        await reporter.event('Warning', 'open_page', msg, { httpStatus, screenshot: file });
        return finish('Closed', msg);
      }
      const msg = httpStatus >= 400 ? `Sayfa açılamadı (HTTP ${httpStatus}).` : `Sayfada başvuru formu bulunamadı (${title}).`;
      await reporter.event('Error', 'open_page', msg, { httpStatus, screenshot: file });
      return finish('Failed', msg);
    }
    await reporter.event('Info', 'open_page', `Sayfa açıldı: "${title}". Başvuru formu bulundu.`, { httpStatus });

    // ---- 2. Adim adim doldur (tek sayfa = tek adim) ----
    for (let step = 1; step <= MAX_STEPS; step++) {
      const stepFilled: FieldReport[] = [];
      const stepSkipped: FieldReport[] = [];

      for (const field of snap.fields) {
        const r = resolveField(payload, field);
        const base = { label: field.label, name: field.name, required: field.required };
        if (r.kind === 'skip') {
          stepSkipped.push({ ...base, reason: r.reason });
          continue;
        }
        try {
          const value = r.value === 'CV' ? input.cv : r.value;
          if (value === null) throw new Error('CV dosyası indirilemedi');
          await fillField(page, field, value);
          stepFilled.push({ ...base, source: r.source });
          if (r.note) await reporter.event('Warning', 'fill', r.note, { field: field.label });
        } catch (err) {
          stepSkipped.push({ ...base, reason: `Doldurulamadı: ${(err as Error).message.split('\n')[0]}` });
        }
      }

      filled.push(...stepFilled);
      skipped.push(...stepSkipped);
      const stepMissing = stepSkipped.filter((s) => s.required);
      missingRequired.push(...stepMissing);

      await reporter.event(
        stepMissing.length ? 'Warning' : 'Info',
        `fill_step_${step}`,
        `Adım ${step}: ${stepFilled.length} alan dolduruldu, ${stepSkipped.length} boş bırakıldı` +
          (stepMissing.length ? ` (zorunlu: ${stepMissing.map((m) => m.label).join(', ')})` : '') + '.',
        {
          filled: stepFilled.map((f) => ({ field: f.label, source: f.source })),
          skipped: stepSkipped.map((s) => ({ field: s.label, required: s.required, reason: s.reason })),
        },
      );

      // Zorunlu alan bos kaldiysa bu adimdan ileri gidilemez (site de izin vermez).
      if (stepMissing.length) {
        const file = await shot(page, `step${step}-missing`);
        const msg = `Zorunlu alanlar doldurulamadı: ${stepMissing.map((m) => `${m.label} (${m.reason})`).join('; ')}`;
        await reporter.event('Warning', 'needs_input', msg, { screenshot: file });
        return finish('NeedsInput', msg);
      }

      if (snap.submitSelector) break;
      if (!snap.nextSelector) {
        const file = await shot(page, 'no-submit');
        const msg = 'Formda "Gönder" ya da "Devam" butonu bulunamadı.';
        await reporter.event('Error', 'fill', msg, { screenshot: file });
        return finish('Failed', msg);
      }

      // Sihirbaz: sonraki adima gec. Alanlar degismediyse site ilerlemeye izin vermemis demektir.
      const before = snap.fields.map((f) => f.name).join('|');
      await page.locator(snap.nextSelector).click();
      await page.waitForTimeout(300);
      snap = await readForm(page);
      if (snap.fields.map((f) => f.name).join('|') === before) {
        const file = await shot(page, `step${step}-blocked`);
        const msg = `Adım ${step}'den ileri geçilemedi (site doğrulaması). ${await pageErrors(page)}`.trim();
        await reporter.event('Warning', 'needs_input', msg, { screenshot: file });
        return finish('NeedsInput', msg);
      }
    }

    if (!snap.submitSelector) return finish('Failed', `En fazla ${MAX_STEPS} adım destekleniyor.`);

    // ---- 3. Gonder (ya da onay icin dur) ----
    const beforeFile = await shot(page, 'filled');
    if (mode === 'HumanApproval') {
      const msg = `Form dolduruldu (${filled.length} alan). "Gönder"e basılmadı; onayın bekleniyor.`;
      await reporter.event('Info', 'ready', msg, { screenshot: beforeFile });
      return finish('ReadyForApproval', msg);
    }

    await reporter.event('Info', 'submit', '"Gönder"e basılıyor (Otomatik mod).');
    const nav = page.waitForNavigation({ timeout: 20_000 }).catch(() => null);
    await page.locator(snap.submitSelector).click();
    const after = await nav;
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const afterStatus = after?.status() ?? 0;
    const afterFile = await shot(page, 'submitted');

    // Onay sayfasindaki basvuru numarasi: once bilinen yerler, sonra metinde arama.
    const refText =
      (await page.locator('#reference-number').first().textContent({ timeout: 1000 }).catch(() => null)) ??
      (await page.locator('[data-reference]').first().getAttribute('data-reference', { timeout: 500 }).catch(() => null));
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const ref =
      refText?.trim() ||
      /\b(BSV-[\w-]+)\b/.exec(bodyText)?.[1] ||
      /(?:başvuru|referans|reference|application)\s*(?:no|numarası|number|id)[:\s]*([A-Z0-9][A-Z0-9-]{4,})/i.exec(bodyText)?.[1];

    if (ref || SUCCESS_RE.test(fold(bodyText))) {
      const msg = ref ? `Başvuru gönderildi. Başvuru no: ${ref}` : 'Başvuru gönderildi (onay sayfası görüldü).';
      await reporter.event('Info', 'submit', msg, { url: page.url(), screenshot: afterFile });
      return finish('Submitted', msg, ref ?? undefined);
    }

    const msg = `Gönderim başarısız${afterStatus ? ` (HTTP ${afterStatus})` : ''}. ${await pageErrors(page)}`.trim();
    await reporter.event('Error', 'submit', msg, { url: page.url(), screenshot: afterFile });
    return finish('Failed', msg);
  } catch (err) {
    if (err instanceof CancelledError) return finish('Cancelled', err.message);
    const msg = timedOut ? `Zaman aşımı: ${Math.round(config.timeoutMs / 1000)} sn içinde bitmedi.` : `Tarayıcı hatası: ${(err as Error).message.split('\n')[0]}`;
    await reporter.event('Error', 'browser', msg).catch(() => undefined);
    return finish('Failed', msg);
  } finally {
    clearTimeout(timer);
    await browser.close().catch(() => undefined);
  }
}

/** Sayfadaki gorunur hata mesajlari (dogrulama ozetleri, alan hatalari). */
async function pageErrors(page: Page): Promise<string> {
  const texts = await page
    .locator('[role="alert"], .field-error, .error, .alert-error, [aria-invalid="true"] + .error')
    .allInnerTexts()
    .catch(() => [] as string[]);
  const uniq = [...new Set(texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  return uniq.length ? `Sitenin mesajı: ${uniq.join(' | ').slice(0, 800)}` : '';
}

export type { FormField };

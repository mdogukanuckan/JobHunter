// Yerel deneme: n8n ve backend OLMADAN worker'in form doldurmasini dener. Gunluk konsola yazilir.
//
//   npm run build
//   npm run try -- http://localhost:8088/ilan/junior-net-developer
//   npm run try -- http://localhost:8088/ilan/full-stack-developer-react-net --mode Automatic --headed
//
// Secenekler:
//   --mode HumanApproval|Automatic   (varsayilan HumanApproval: Gonder'e basmaz)
//   --payload <dosya.json>           (varsayilan samples/payload.sample.json)
//   --cv <dosya.pdf>                 (verilmezse kucuk bir test PDF'i uretilir)
//   --headed                         (tarayiciyi gorunur ac; bilgisayarinda calistirirken izlemek icin)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Reporter } from './backend.js';
import { config } from './config.js';
import { runApply } from './apply.js';
import type { AutomationMode, Payload } from './types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const jobUrl = args.find((a) => /^https?:\/\//.test(a));
if (!jobUrl) {
  console.error('Kullanım: npm run try -- <ilan-url> [--mode Automatic] [--payload dosya.json] [--cv dosya.pdf] [--headed]');
  process.exit(1);
}
const mode = (opt('mode') ?? 'HumanApproval') as AutomationMode;
if (args.includes('--headed')) config.headless = false;
if (!process.env.SCREENSHOT_DIR) config.screenshotDir = path.join(ROOT, 'data', 'screenshots');

const payload = JSON.parse(await fs.readFile(opt('payload') ?? path.join(ROOT, 'samples', 'payload.sample.json'), 'utf8')) as Payload;
const cvPath = opt('cv');
const cv = cvPath
  ? { name: path.basename(cvPath), mimeType: 'application/pdf', buffer: await fs.readFile(cvPath) }
  : { name: 'test-cv.pdf', mimeType: 'application/pdf', buffer: minimalPdf() };

// Ornek pakette CV yok; komutta verilen (ya da uretilen) dosya bu denemenin CV'si sayilir.
payload.cv ??= { name: cv.name, fileName: cv.name, contentType: cv.mimeType, sizeBytes: cv.buffer.length, downloadUrl: '' };

const reporter: Reporter = {
  async event(level, step, message, data) {
    const icon = level === 'Error' ? '✖' : level === 'Warning' ? '!' : '·';
    console.log(`${icon} [${step}] ${message}`);
    if (data && process.env.VERBOSE) console.log('   ', JSON.stringify(data));
  },
};

const result = await runApply({ jobId: 'cli-test', mode, jobUrl, payload, cv, reporter });
console.log('\nSONUÇ:', result.outcome, '-', result.message);
console.log('Doldurulan:', result.filled.map((f) => `${f.label} ← ${f.source}`));
console.log('Boş bırakılan:', result.skipped.map((s) => `${s.label}${s.required ? ' (zorunlu)' : ''} → ${s.reason}`));
if (result.screenshots.length) console.log('Ekran görüntüleri:', config.screenshotDir);

/** Icinde tek bos sayfa olan gecerli bir PDF (test CV'si). */
function minimalPdf(): Buffer {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  );
}

// JobHunter browser-worker: n8n'in cagirdigi kucuk HTTP servisi.
//
//   GET  /health  → { status: "ok" }
//   POST /apply   → header X-Worker-Secret; govde ApplyRequest (types.ts)
//                   Senkron calisir: form doldurulup bitince ApplyResult doner (genelde 5-30 sn).
//
// Beklenmeyen hata (yanlis istek, backend'e ulasilamiyor) → 4xx/5xx; n8n bunu hata dalina yonlendirir.
// Beklenen sonuclar (ilan kapali, zorunlu alan eksik, gonderim reddedildi) → 200 + outcome.

import crypto from 'node:crypto';
import http from 'node:http';
import { runApply } from './apply.js';
import { backend, CancelledError } from './backend.js';
import { config } from './config.js';
import type { ApplyRequest, ApplyResult } from './types.js';

const MAX_PARALLEL = 2;
let running = 0;

function send(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function secretOk(header: string | string[] | undefined): boolean {
  const given = Buffer.from(String(header ?? ''));
  const expected = Buffer.from(config.workerSecret);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 64 * 1024) throw Object.assign(new Error('İstek çok büyük.'), { status: 413 });
    chunks.push(c as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Geçersiz JSON.'), { status: 400 });
  }
}

function parseRequest(body: unknown): ApplyRequest {
  const b = (body ?? {}) as Partial<ApplyRequest>;
  const missing = (['jobId', 'mode', 'jobUrl', 'payloadUrl', 'eventsUrl'] as const).filter((k) => !b[k]);
  if (missing.length) throw Object.assign(new Error(`Eksik alan(lar): ${missing.join(', ')}`), { status: 400 });
  if (b.mode !== 'HumanApproval' && b.mode !== 'Automatic') throw Object.assign(new Error('mode: HumanApproval | Automatic'), { status: 400 });
  return b as ApplyRequest;
}

async function handleApply(req: ApplyRequest): Promise<ApplyResult> {
  const started = Date.now();
  const reporter = backend.reporter(req.eventsUrl);
  try {
    const payload = await backend.payload(req.payloadUrl);
    let cv = null;
    if (payload.cv) {
      const buffer = await backend.cv(payload.cv.downloadUrl);
      cv = { name: payload.cv.fileName, mimeType: payload.cv.contentType || 'application/pdf', buffer };
      await reporter.event('Info', 'download_cv', `CV indirildi: ${payload.cv.fileName} (${Math.round(buffer.length / 1024)} kB)`);
    } else {
      await reporter.event('Warning', 'download_cv', 'CV yok: form CV isterse iş onaya düşecek.');
    }
    return await runApply({ jobId: req.jobId, mode: req.mode, jobUrl: req.jobUrl, payload, cv, reporter });
  } catch (err) {
    if (err instanceof CancelledError) {
      return { outcome: 'Cancelled', message: err.message, filled: [], skipped: [], missingRequired: [], screenshots: [], durationMs: Date.now() - started };
    }
    throw err;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://worker');
  try {
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { status: 'ok', running });

    if (req.method === 'POST' && url.pathname === '/apply') {
      if (!secretOk(req.headers['x-worker-secret'])) return send(res, 403, { message: 'X-Worker-Secret yanlış ya da yok.' });
      const body = parseRequest(await readJson(req));
      if (running >= MAX_PARALLEL) return send(res, 429, { message: `Aynı anda en fazla ${MAX_PARALLEL} başvuru işlenir.` });

      running++;
      log('BAŞLADI', body.jobId, body.mode, body.jobUrl);
      try {
        const result = await handleApply(body);
        log('BİTTİ', body.jobId, result.outcome, `${result.durationMs} ms`, result.message);
        return send(res, 200, result);
      } finally {
        running--;
      }
    }

    return send(res, 404, { message: 'Bulunamadı' });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    log('HATA', status, (err as Error).message);
    if (!res.headersSent) send(res, status, { message: (err as Error).message });
  }
});

function log(...parts: unknown[]) {
  const t = new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' });
  console.log(`[${t}]`, ...parts);
}

server.listen(config.port, '0.0.0.0', () => {
  log(`browser-worker hazır: port ${config.port}. İzinli sunucular: ${config.allowedHosts.join(', ')}`);
});

// docker compose down / Ctrl+C: acik istekleri beklemeden kapan.
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => server.close(() => process.exit(0)));

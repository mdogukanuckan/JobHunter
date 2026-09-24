// JobHunter - sahte kariyer sitesi (Faz 10 testleri için)
//
// Bağımlılık yok; yalnızca Node.js (18+) gerekir.
//   node server.js            → http://localhost:8088
//   PORT=9000 node server.js  → farklı port
//
// Gelen başvurular data/submissions/<başvuru-no>/ altına kaydedilir (application.json + cv.pdf).

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { findJob, fieldsOf } from './jobs.js';
import * as views from './views.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8088;
const HOST = process.env.HOST || '0.0.0.0'; // n8n container'ı host.docker.internal:8088 ile ulaşabilsin diye
const DATA_DIR = path.join(ROOT, 'data', 'submissions');
const MAX_BODY = 6 * 1024 * 1024;
const MAX_CV = 5 * 1024 * 1024;
const ID_RE = /^BSV-\d{8}-[0-9A-F]{6}$/;

// ---- Yardımcılar ----------------------------------------------------------------

function send(res, status, body, type = 'text/html; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
const sendJson = (res, status, data) => send(res, status, JSON.stringify(data, null, 2), 'application/json; charset=utf-8');
const redirect = (res, location) => send(res, 303, '', 'text/plain', { Location: location });

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(httpError(413, 'İstek çok büyük (en fazla 6 MB).'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// multipart/form-data ayrıştırıcı (tarayıcı formları ve curl -F için yeterli, minimal sürüm)
function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!m) throw httpError(400, 'multipart boundary bulunamadı.');
  const boundary = Buffer.from('--' + (m[1] || m[2]).trim());
  const fields = {};
  const files = {};
  let pos = buf.indexOf(boundary);
  while (pos !== -1) {
    pos += boundary.length;
    if (buf[pos] === 45 && buf[pos + 1] === 45) break; // "--" → son sınır
    pos += 2; // CRLF
    const headEnd = buf.indexOf('\r\n\r\n', pos);
    if (headEnd === -1) break;
    const head = buf.subarray(pos, headEnd).toString('utf8');
    const next = buf.indexOf(boundary, headEnd + 4);
    if (next === -1) break;
    const content = buf.subarray(headEnd + 4, next - 2); // sondaki CRLF hariç
    const name = /(?:^|;)\s*name="([^"]*)"/im.exec(head)?.[1];
    const filename = /filename="([^"]*)"/i.exec(head)?.[1];
    const ctype = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1];
    if (name) {
      if (filename !== undefined) {
        if (filename) files[name] = { filename: path.basename(filename), contentType: ctype, data: content };
      } else {
        fields[name] = content.toString('utf8');
      }
    }
    pos = next;
  }
  return { fields, files };
}

async function parseForm(req) {
  const type = req.headers['content-type'] || '';
  const body = await readBody(req);
  if (type.startsWith('multipart/form-data')) return parseMultipart(body, type);
  if (type.startsWith('application/x-www-form-urlencoded')) {
    return { fields: Object.fromEntries(new URLSearchParams(body.toString('utf8'))), files: {} };
  }
  throw httpError(415, 'Desteklenmeyen içerik türü. multipart/form-data bekleniyor.');
}

// ---- Doğrulama -----------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(job, fields, files) {
  const errors = {};
  const values = {};
  let cv = null;

  for (const f of fieldsOf(job)) {
    if (f.type === 'file') {
      const file = files[f.name];
      if (!file || file.data.length === 0) {
        if (f.required) errors[f.name] = 'Lütfen CV dosyanızı yükleyin.';
      } else if (!/\.pdf$/i.test(file.filename) || file.data.subarray(0, 4).toString('latin1') !== '%PDF') {
        errors[f.name] = 'Yalnızca PDF dosyası kabul edilir.';
      } else if (file.data.length > MAX_CV) {
        errors[f.name] = 'CV dosyası en fazla 5 MB olabilir.';
      } else {
        cv = file;
      }
      continue;
    }

    const raw = String(fields[f.name] ?? '').trim();
    values[f.name] = raw;
    if (!raw) {
      if (f.required) errors[f.name] = f.type === 'checkbox' ? 'Devam etmek için onay vermeniz gerekiyor.' : `"${stripTags(f.label)}" alanı zorunludur.`;
      continue;
    }
    if (f.maxLength && raw.length > f.maxLength) {
      errors[f.name] = `En fazla ${f.maxLength} karakter girebilirsiniz.`;
      continue;
    }
    switch (f.type) {
      case 'email':
        if (!EMAIL_RE.test(raw)) errors[f.name] = 'Geçerli bir e-posta adresi girin.';
        break;
      case 'tel': {
        const digits = raw.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 13) errors[f.name] = 'Geçerli bir telefon numarası girin (ör. 0532 123 45 67).';
        break;
      }
      case 'url':
        if (!/^https?:\/\/\S+\.\S+/.test(raw)) errors[f.name] = 'Adres http:// veya https:// ile başlamalıdır.';
        break;
      case 'number': {
        const n = Number(raw);
        if (!Number.isFinite(n)) errors[f.name] = 'Sayı girin.';
        else if (f.min !== undefined && n < f.min) errors[f.name] = `En az ${f.min} olabilir.`;
        else if (f.max !== undefined && n > f.max) errors[f.name] = `En fazla ${f.max} olabilir.`;
        break;
      }
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) errors[f.name] = 'Geçerli bir tarih girin.';
        break;
      case 'select':
      case 'radio':
        if (!f.options.includes(raw)) errors[f.name] = 'Listeden bir seçenek seçin.';
        break;
    }
  }
  return { errors, values, cv };
}

const stripTags = (s) => s.replace(/<[^>]*>/g, '');

// ---- Kayıt ----------------------------------------------------------------------

function newId() {
  const d = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }).replaceAll('-', '');
  return `BSV-${d}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function listSubmissions() {
  let dirs;
  try {
    dirs = await fs.readdir(DATA_DIR);
  } catch {
    return [];
  }
  const out = [];
  for (const d of dirs) {
    if (!ID_RE.test(d)) continue;
    try {
      out.push(JSON.parse(await fs.readFile(path.join(DATA_DIR, d, 'application.json'), 'utf8')));
    } catch {
      /* yarım kalmış kayıt → atla */
    }
  }
  return out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

async function getSubmission(id) {
  if (!ID_RE.test(id)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, id, 'application.json'), 'utf8'));
  } catch {
    return null;
  }
}

async function saveSubmission(job, values, cv, req, novalidate) {
  const id = newId();
  const dir = path.join(DATA_DIR, id);
  await fs.mkdir(dir, { recursive: true });
  const record = {
    id,
    jobSlug: job.slug,
    jobTitle: job.title,
    submittedAt: new Date().toISOString(),
    values,
    cv: cv ? { originalName: cv.filename, size: cv.data.length, storedAs: 'cv.pdf' } : null,
    meta: {
      userAgent: req.headers['user-agent'] || null,
      remoteAddress: req.socket.remoteAddress,
      browserValidationDisabled: novalidate,
    },
  };
  if (cv) await fs.writeFile(path.join(dir, 'cv.pdf'), cv.data);
  await fs.writeFile(path.join(dir, 'application.json'), JSON.stringify(record, null, 2));
  return record;
}

// ---- Rotalar --------------------------------------------------------------------

const STATIC = { 'style.css': 'text/css; charset=utf-8', 'wizard.js': 'text/javascript; charset=utf-8' };

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';
  const baseUrl = `http://${req.headers.host || `localhost:${PORT}`}`;
  const novalidate = url.searchParams.get('novalidate') === '1';
  let m;

  if (req.method === 'GET' && p === '/') return send(res, 200, views.listPage());
  if (req.method === 'GET' && p === '/health') return sendJson(res, 200, { status: 'ok' });

  if (req.method === 'GET' && (m = /^\/static\/([\w.-]+)$/.exec(p)) && STATIC[m[1]]) {
    return send(res, 200, await fs.readFile(path.join(ROOT, 'public', m[1])), STATIC[m[1]]);
  }

  if (req.method === 'GET' && (m = /^\/ilan\/([\w-]+)$/.exec(p))) {
    const job = findJob(m[1]);
    if (!job) return send(res, 404, views.notFoundPage());
    return send(res, 200, views.jobPage(job, { baseUrl, novalidate }));
  }

  if (req.method === 'POST' && (m = /^\/ilan\/([\w-]+)\/basvur$/.exec(p))) {
    const job = findJob(m[1]);
    if (!job) return send(res, 404, views.notFoundPage());
    if (job.status !== 'open') {
      log('REDDEDİLDİ (ilan kapalı)', job.slug);
      return send(res, 410, views.jobPage(job, { baseUrl }));
    }

    const { fields, files } = await parseForm(req);
    const { errors, values, cv } = validate(job, fields, files);

    if (!Object.keys(errors).length) {
      const existing = await listSubmissions();
      if (existing.some((s) => s.jobSlug === job.slug && s.values.email?.toLowerCase() === values.email.toLowerCase())) {
        log('REDDEDİLDİ (mükerrer)', job.slug, values.email);
        return send(res, 409, views.jobPage(job, {
          baseUrl, values, errors: {}, novalidate,
          formError: 'Bu ilana bu e-posta adresiyle daha önce başvuru yapılmış.',
        }));
      }
      const sub = await saveSubmission(job, values, cv, req, novalidate);
      log('BAŞVURU ALINDI', sub.id, job.slug, values.fullName, values.email, cv ? `CV: ${cv.filename}` : 'CV yok');
      return redirect(res, `/basvuru/${sub.id}`);
    }

    log('DOĞRULAMA HATASI', job.slug, Object.keys(errors).join(', '));
    return send(res, 422, views.jobPage(job, { baseUrl, values, errors, novalidate }));
  }

  if (req.method === 'GET' && (m = /^\/basvuru\/([\w-]+)$/.exec(p))) {
    const sub = await getSubmission(m[1]);
    return sub ? send(res, 200, views.confirmationPage(sub)) : send(res, 404, views.notFoundPage());
  }

  // ---- Test/inceleme uçları ----
  if (req.method === 'GET' && p === '/admin') return send(res, 200, views.adminPage(await listSubmissions()));

  if (req.method === 'GET' && (m = /^\/admin\/([\w-]+)\/cv$/.exec(p))) {
    if (!ID_RE.test(m[1])) return send(res, 404, views.notFoundPage());
    try {
      return send(res, 200, await fs.readFile(path.join(DATA_DIR, m[1], 'cv.pdf')), 'application/pdf');
    } catch {
      return send(res, 404, views.notFoundPage());
    }
  }

  if (req.method === 'POST' && p === '/admin/temizle') {
    await fs.rm(DATA_DIR, { recursive: true, force: true });
    log('TÜM BAŞVURULAR SİLİNDİ');
    return redirect(res, '/admin');
  }

  if (p === '/api/submissions') {
    if (req.method === 'GET') {
      const job = url.searchParams.get('job');
      const subs = await listSubmissions();
      return sendJson(res, 200, job ? subs.filter((s) => s.jobSlug === job) : subs);
    }
    if (req.method === 'DELETE') {
      await fs.rm(DATA_DIR, { recursive: true, force: true });
      log('TÜM BAŞVURULAR SİLİNDİ (API)');
      return send(res, 204, '');
    }
  }

  return send(res, 404, views.notFoundPage());
}

function log(...parts) {
  const t = new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' });
  console.log(`[${t}]`, ...parts);
}

const server = http.createServer(async (req, res) => {
  try {
    await handle(req, res);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) send(res, status, `${status} - ${err.message}`, 'text/plain; charset=utf-8');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Sahte kariyer sitesi çalışıyor: http://localhost:${PORT}`);
  console.log(`  Başvurular:  http://localhost:${PORT}/admin`);
  console.log(`  n8n (Docker) içinden: http://host.docker.internal:${PORT}`);
});

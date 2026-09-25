// Ortam degiskenleri (docker-compose.yml → environment). Eksik zorunlu ayar varsa servis hic acilmaz.

const env = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Ortam degiskeni eksik: ${name}`);
  return v;
};

const isCli = process.argv[1]?.endsWith('cli.js') ?? false;

export const config = {
  port: Number(process.env.PORT ?? 3100),
  /** n8n → worker istegindeki X-Worker-Secret ile ayni olmali. */
  workerSecret: isCli ? '' : env('WORKER_SECRET'),
  /** worker → backend (X-Automation-Key). Backend'deki Automation:ApiKey. */
  apiKey: isCli ? (process.env.JOBHUNTER_API_KEY ?? '') : env('JOBHUNTER_API_KEY'),
  /**
   * GUVENLIK: sadece bu sunuculardaki ilanlar acilir. Faz 12'ye (gercek basvuru) kadar sadece yerel test sitesi.
   * Virgulle ayrilmis; "*" her yere izin verir (kullanma).
   */
  allowedHosts: (process.env.ALLOWED_HOSTS ?? 'localhost,127.0.0.1,host.docker.internal')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
  /** Container icinde localhost → host.docker.internal. cli'da (bilgisayarda) kapali. */
  rewriteLocalhost: (process.env.REWRITE_LOCALHOST ?? (isCli ? 'false' : 'true')) === 'true',
  screenshotDir: process.env.SCREENSHOT_DIR ?? '/data/screenshots',
  /** Tek basvurunun en fazla suresi. n8n'deki HTTP Request zaman asimi bundan uzun olmali. */
  timeoutMs: Number(process.env.APPLY_TIMEOUT_MS ?? 120_000),
  headless: (process.env.HEADLESS ?? 'true') !== 'false',
  /** Playwright'in kendi tarayicisi yerine baska bir Chromium (orn. yerel denemede). */
  chromiumPath: process.env.CHROMIUM_PATH || undefined,
};

// Backend'in n8n callback uclari (X-Automation-Key ile): veri paketi, CV, gunluk.
// Worker da n8n gibi bu uclari kullanir; boylece gunluk tarayici adimlarini CANLI gosterir.

import { config } from './config.js';
import type { Payload } from './types.js';

/** Backend 409 dondu: is iptal edilmis ya da bitmis. Otomasyon hemen durmali. */
export class CancelledError extends Error {
  constructor() {
    super('İş iptal edilmiş ya da bitmiş (backend 409).');
  }
}

export type EventLevel = 'Info' | 'Warning' | 'Error';

/** Gunluge yazma arayuzu. Sunucuda backend'e, deneme komutunda (cli) konsola yazar. */
export interface Reporter {
  event(level: EventLevel, step: string, message: string, data?: unknown): Promise<void>;
}

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(rewriteLocalhost(url), {
    ...init,
    headers: { 'X-Automation-Key': config.apiKey, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 409) throw new CancelledError();
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${url} ${body.slice(0, 300)}`);
  }
  return res;
}

export const backend = {
  async payload(url: string): Promise<Payload> {
    return (await call(url)).json() as Promise<Payload>;
  },
  async cv(url: string): Promise<Buffer> {
    return Buffer.from(await (await call(url)).arrayBuffer());
  },
  reporter(eventsUrl: string): Reporter {
    return {
      async event(level, step, message, data) {
        await call(eventsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level, step, message: message.slice(0, 2000), data: data ?? null }),
        });
      },
    };
  },
};

/**
 * Container icinde "localhost" container'in kendisidir. Kullanici ilan linkini tarayicisindan
 * http://localhost:8088/... diye kopyalar; worker bunu bilgisayara giden host.docker.internal'a cevirir.
 */
export function rewriteLocalhost(url: string): string {
  if (!config.rewriteLocalhost) return url;
  const u = new URL(url);
  if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') u.hostname = 'host.docker.internal';
  return u.toString();
}

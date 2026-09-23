import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from './types';

/*
 * Tum API istekleri bu Axios instance'i uzerinden gider.
 *
 * Token stratejisi:
 *  - Access token (15 dk) SADECE bellekte (bu modul degiskeninde) tutulur. localStorage'a yazilmaz,
 *    boylece XSS ile calinamaz. Sayfa yenilenince kaybolur -> acilista /auth/refresh ile yeniden alinir.
 *  - Refresh token httpOnly cookie'dedir; JS onu goremez, tarayici /api/auth isteklerine kendisi ekler.
 */

let accessToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Her istege "Authorization: Bearer <token>" eklenir.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---------- Refresh (tek ucus / single-flight) ----------
// Ayni anda 5 istek 401 alirsa 5 kez refresh cagrilmamali: backend token rotasyonu yapiyor,
// ikinci cagri zaten iptal edilmis token'i gonderirdi. Bu yuzden devam eden refresh Promise'i paylasilir.

let refreshInFlight: Promise<AuthResponse | null> | null = null;

async function callRefresh(): Promise<AuthResponse> {
  // Interceptor'suz axios kullanilir: refresh'in kendisi 401 alirsa sonsuz donguye girilmesin.
  const { data } = await axios.post<AuthResponse>('/api/auth/refresh', null, { withCredentials: true });
  return data;
}

export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        return await callRefresh();
      } catch {
        // Baska bir sekme ayni anda yenilemis olabilir: tarayici yeni cookie'yi almistir, bir kez daha dene.
        await new Promise((resolve) => setTimeout(resolve, 400));
        try {
          return await callRefresh();
        } catch {
          return null;
        }
      }
    })()
      .then((session) => {
        tokenStore.set(session?.accessToken ?? null);
        return session;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Oturum tamamen dustugunde (refresh de basarisiz) AuthContext'e haber vermek icin.
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// 401 gelirse: bir kez refresh dene, basariliysa istegi yeni token'la tekrarla.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const isAuthEndpoint = original?.url?.startsWith('/auth/') ?? false;

    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      const session = await refreshSession();
      if (session) {
        original.headers.Authorization = `Bearer ${session.accessToken}`;
        return api(original);
      }
      sessionExpiredHandler?.();
    }

    return Promise.reject(error);
  },
);

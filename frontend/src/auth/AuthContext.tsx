import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { refreshSession, setSessionExpiredHandler, tokenStore } from '../api/client';
import { useAppTheme } from '../theme/AppThemeProvider';
import type { AuthResponse, CurrentUser, LoginRequest, RegisterRequest } from '../api/types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  /** Oturum refresh de basarisiz oldugu icin dustuyse true (login sayfasinda bilgi gosterilir). */
  sessionExpired: boolean;
  login: (body: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const toUser = (r: AuthResponse): CurrentUser => ({ id: r.userId, email: r.email, fullName: r.fullName });

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const { applyServerAppearance } = useAppTheme();

  const applySession = useCallback((session: AuthResponse) => {
    tokenStore.set(session.accessToken);
    // Hesaptaki tema tercihi: baska cihazda degistirildiyse burada da uygulanir.
    if (session.appearance) applyServerAppearance(session.appearance);
    setUser(toUser(session));
    setStatus('authenticated');
    setSessionExpired(false);
  }, [applyServerAppearance]);

  const clearSession = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    setStatus('anonymous');
    queryClient.clear(); // onceki kullanicinin cache'lenmis verisi kalmasin
  }, [queryClient]);

  // Uygulama acilisi: access token bellekte oldugu icin sayfa yenilenince kaybolur.
  // httpOnly cookie hala gecerliyse /auth/refresh yeni token verir ve kullanici giris yapmis kalir.
  useEffect(() => {
    let cancelled = false;
    void refreshSession().then((session) => {
      if (cancelled) return;
      if (session) applySession(session);
      else setStatus('anonymous');
    });
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  // Bir API istegi 401 alip refresh de basarisiz olursa client.ts bunu cagirir.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSession();
      setSessionExpired(true);
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  const login = useCallback(async (body: LoginRequest) => applySession(await authApi.login(body)), [applySession]);

  const register = useCallback(
    async (body: RegisterRequest) => applySession(await authApi.register(body)),
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, sessionExpired, login, register, logout }),
    [status, user, sessionExpired, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider icinde kullanilmali.');
  return ctx;
}

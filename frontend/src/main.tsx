import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { NotifyProvider } from './components/Notify';
import './i18n';
import { AppThemeProvider } from './theme/AppThemeProvider';

// TanStack Query: sunucu verisinin cache'i. staleTime boyunca ayni veri icin tekrar istek atilmaz.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Tema en distadir: Notify (Snackbar) ve tum sayfalar secili temayla cizilir. */}
      <AppThemeProvider>
        <BrowserRouter>
          <NotifyProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </NotifyProvider>
        </BrowserRouter>
      </AppThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);

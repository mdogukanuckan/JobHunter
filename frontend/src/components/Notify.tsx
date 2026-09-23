import { Alert, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/*
 * Uygulama geneli kisa bildirim (snackbar). Herhangi bir bilesen useNotify() ile mesaj gosterebilir:
 *   const notify = useNotify();  notify('Kaydedildi');  notify(hataMesaji, 'error');
 */

type Severity = 'success' | 'error' | 'info';
type NotifyFn = (message: string, severity?: Severity) => void;

const NotifyContext = createContext<NotifyFn | null>(null);

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; severity: Severity; key: number } | null>(null);

  const notify = useCallback<NotifyFn>((message, severity = 'success') => {
    setState({ message, severity, key: Date.now() });
  }, []);

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={state?.key}
        open={state !== null}
        autoHideDuration={4000}
        onClose={(_e, reason) => reason !== 'clickaway' && setState(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {state ? (
          <Alert severity={state.severity} variant="filled" onClose={() => setState(null)} sx={{ width: '100%' }}>
            {state.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotifyContext.Provider>
  );
}

export function useNotify(): NotifyFn {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify, NotifyProvider icinde kullanilmali.');
  return ctx;
}

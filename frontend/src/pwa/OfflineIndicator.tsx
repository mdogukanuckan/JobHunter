import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import { Box, Fade } from '@mui/material';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

function subscribe(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

/*
 * Baglanti koptugunda ust barin altinda kucuk bir kapsul gosterir; geri gelince kisa sure "tekrar cevrimici" der.
 * Cevrimdisiyken TanStack Query istekleri hata vermek yerine bekletir (networkMode: 'online'),
 * baglanti gelince kendiliginden devam eder. Yani kullanicinin yaptigi degisiklik kaybolmaz ama kaydedilmesi gecikir.
 */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  const [showBack, setShowBack] = useState(false);
  const wasOffline = useRef(!online);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowBack(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowBack(true);
    const timer = setTimeout(() => setShowBack(false), 3000);
    return () => clearTimeout(timer);
  }, [online]);

  const visible = !online || showBack;

  return (
    <Fade in={visible} unmountOnExit>
      <Box
        role="status"
        aria-live="polite"
        sx={{
          position: 'fixed',
          top: { xs: 'calc(64px + env(safe-area-inset-top))', sm: 76 },
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: (th) => th.zIndex.snackbar,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 0.75,
          borderRadius: 999,
          fontSize: 13.5,
          fontWeight: 700,
          width: 'max-content',
          maxWidth: 'calc(100vw - 32px)',
          textAlign: 'center',
          lineHeight: 1.3,
          boxShadow: 3,
          bgcolor: online ? 'success.main' : 'grey.900',
          color: online ? 'success.contrastText' : '#fff',
        }}
      >
        {online ? <CloudDoneOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} /> : <CloudOffOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} />}
        {online ? t('pwa.backOnline') : t('pwa.offline')}
      </Box>
    </Fade>
  );
}

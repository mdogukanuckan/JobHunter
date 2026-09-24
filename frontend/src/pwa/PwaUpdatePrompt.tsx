import { Alert, Button, Snackbar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Uygulama gunlerce acik kalabilir; bu aralikla yeni surum var mi diye sunucuya bakilir. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/*
 * Service worker'i kaydeder ve iki durumu kullaniciya bildirir:
 *  - offlineReady: ilk kurulumda uygulama kabugu onbellege alindi (bir kez gosterilir).
 *  - needRefresh:  yeni surum indirildi ve bekliyor. "Yenile" deyince yeni SW devreye girer ve sayfa yenilenir.
 *    Kendiliginden yenilemiyoruz ki acik bir formdaki yazilanlar kaybolmasin.
 */
export function PwaUpdatePrompt() {
  const { t } = useTranslation();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        if (navigator.onLine) void registration.update();
      }, UPDATE_CHECK_MS);
    },
  });

  // Mobilde alttaki menunun ustunde dursun.
  const position = { bottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 24 } };

  return (
    <>
      <Snackbar open={needRefresh} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={position}>
        <Alert
          severity="info"
          variant="filled"
          sx={{ alignItems: 'center' }}
          action={
            <>
              <Button color="inherit" size="small" onClick={() => setNeedRefresh(false)}>
                {t('pwa.later')}
              </Button>
              <Button color="inherit" size="small" sx={{ fontWeight: 800 }} onClick={() => void updateServiceWorker(true)}>
                {t('pwa.reload')}
              </Button>
            </>
          }
        >
          {t('pwa.updateAvailable')}
        </Alert>
      </Snackbar>

      <Snackbar
        open={offlineReady && !needRefresh}
        autoHideDuration={5000}
        onClose={(_e, reason) => reason !== 'clickaway' && setOfflineReady(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={position}
      >
        <Alert severity="success" variant="filled" onClose={() => setOfflineReady(false)}>
          {t('pwa.offlineReady')}
        </Alert>
      </Snackbar>
    </>
  );
}

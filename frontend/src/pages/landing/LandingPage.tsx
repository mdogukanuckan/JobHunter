import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { FEATURES, LandingFooter, LandingNav, MockBoard } from './shared';

/** Anasayfa (landing): ortalanmis hero, altinda pano onizlemesi, ozellik izgarasi ve kapanis CTA'si. */
export function LandingPage() {
  const { t } = useTranslation();
  const signedIn = useAuth().status === 'authenticated';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <LandingNav />

      <Container maxWidth="md" sx={{ pt: { xs: 8, md: 12 }, textAlign: 'center' }}>
        <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>
          {t('landing.eyebrow')}
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 800, mt: 1, fontSize: { xs: 36, md: 56 }, lineHeight: 1.1 }}>
          {t('landing.heroLine1')}
          <br />
          {t('landing.heroLine2')}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400, maxWidth: 560, mx: 'auto' }}>
          {t('landing.heroText')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
          {signedIn ? (
            <Button component={RouterLink} to="/board" variant="contained" size="large">
              {t('landing.openApp')}
            </Button>
          ) : (
            <>
              <Button component={RouterLink} to="/register" variant="contained" size="large">
                {t('landing.createAccount')}
              </Button>
              <Button component={RouterLink} to="/login" variant="outlined" size="large">
                {t('auth.login')}
              </Button>
            </>
          )}
        </Stack>
      </Container>

      <Container maxWidth="lg" sx={{ mt: { xs: 7, md: 10 } }}>
        <MockBoard />
      </Container>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          {FEATURES.map((f) => (
            <Box key={f.key} sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Box sx={{ color: 'primary.main', mb: 1.5, display: 'flex' }}>{f.icon}</Box>
              <Typography sx={{ fontWeight: 700, mb: 0.75 }}>{t(`landing.features.${f.key}.title`)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t(`landing.features.${f.key}.text`)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 8, textAlign: 'center', px: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {t('landing.ctaTitle')}
        </Typography>
        <Button component={RouterLink} to={signedIn ? '/board' : '/register'} variant="contained" size="large" sx={{ mt: 3, bgcolor: 'primary.contrastText', color: 'primary.main', '&:hover': { bgcolor: 'primary.contrastText', opacity: 0.9 } }}>
          {signedIn ? t('landing.openApp') : t('landing.getStarted')}
        </Button>
      </Box>

      <LandingFooter />
    </Box>
  );
}

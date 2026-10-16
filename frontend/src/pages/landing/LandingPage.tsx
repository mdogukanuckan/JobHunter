import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { FEATURES, LandingFooter, LandingNav, MockBoard } from './shared';

/** Anasayfa (landing): ortalanmis hero, altinda pano onizlemesi, ozellik izgarasi ve kapanis CTA'si. */
export function LandingPage() {
  const signedIn = useAuth().status === 'authenticated';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <LandingNav />

      <Container maxWidth="md" sx={{ pt: { xs: 8, md: 12 }, textAlign: 'center' }}>
        <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>
          Job search, organised
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 800, mt: 1, fontSize: { xs: 36, md: 56 }, lineHeight: 1.1 }}>
          Every application.
          <br />
          One calm place.
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400, maxWidth: 560, mx: 'auto' }}>
          Track applications, interviews, CVs and to-dos — and let AI fill in the repetitive forms while you stay in control.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
          {signedIn ? (
            <Button component={RouterLink} to="/board" variant="contained" size="large">
              Open app
            </Button>
          ) : (
            <>
              <Button component={RouterLink} to="/register" variant="contained" size="large">
                Create free account
              </Button>
              <Button component={RouterLink} to="/login" variant="outlined" size="large">
                Sign in
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
            <Box key={f.title} sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Box sx={{ color: 'primary.main', mb: 1.5, display: 'flex' }}>{f.icon}</Box>
              <Typography sx={{ fontWeight: 700, mb: 0.75 }}>{f.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {f.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 8, textAlign: 'center', px: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Ready to stop juggling spreadsheets?
        </Typography>
        <Button component={RouterLink} to={signedIn ? '/board' : '/register'} variant="contained" color="inherit" size="large" sx={{ mt: 3, color: 'primary.main' }}>
          {signedIn ? 'Open app' : 'Get started'}
        </Button>
      </Box>

      <LandingFooter />
    </Box>
  );
}

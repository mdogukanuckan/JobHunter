import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

/** Login ve Register sayfalarinin ortak cercevesi: ortalanmis kart. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Box sx={{ position: 'fixed', top: 16, right: 16 }}>
        <LanguageSwitcher />
      </Box>
      <Paper sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={0.5} sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }} color="primary">
            {t('app.name')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('app.tagline')}
          </Typography>
        </Stack>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
        {children}
      </Paper>
    </Box>
  );
}

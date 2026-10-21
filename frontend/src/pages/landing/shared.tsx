import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DescriptionIcon from '@mui/icons-material/Description';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import { Box, Button, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { LanguageSwitcher } from '../../layout/LanguageSwitcher';

/** Landing sayfasi icin ortak parcalar. Metinler i18n'de "landing.*" altinda. */

export const FEATURES: { key: string; icon: ReactNode }[] = [
  { key: 'kanban', icon: <ViewKanbanIcon /> },
  { key: 'ai', icon: <AutoAwesomeIcon /> },
  { key: 'calendar', icon: <CalendarMonthIcon /> },
  { key: 'cvs', icon: <DescriptionIcon /> },
];

export const BOARD_COLUMNS: { name: string; cards: { role: string; company: string }[] }[] = [
  { name: 'Wishlist', cards: [{ role: 'Backend Developer', company: 'Acme Corp' }, { role: '.NET Engineer', company: 'Northwind' }] },
  { name: 'Applied', cards: [{ role: 'Full-stack Developer', company: 'Globex' }] },
  { name: 'Interview', cards: [{ role: 'Software Engineer', company: 'Initech' }, { role: 'Platform Engineer', company: 'Umbrella' }] },
  { name: 'Offer', cards: [{ role: 'Senior Developer', company: 'Hooli' }] },
];

/** Panonun sade bir maketi: gercek veri yok, sadece gorsel. */
export function MockBoard({ sx }: { sx?: SxProps<Theme> }) {
  const { t } = useTranslation();

  return (
    <Box
      aria-hidden
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 1.5,
        p: 2,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 6,
        ...sx,
      }}
    >
      {BOARD_COLUMNS.map((col) => (
        <Box key={col.name} sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
            {t(`status.${col.name}`)} · {col.cards.length}
          </Typography>
          <Stack spacing={1}>
            {col.cards.map((c) => (
              <Box key={c.role} sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 700 }}>
                  {c.role}
                </Typography>
                <Typography noWrap variant="caption" color="text.secondary">
                  {c.company}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

export function LandingNav() {
  const { t } = useTranslation();
  const { status } = useAuth();

  return (
    <Stack
      component="header"
      direction="row"
      sx={{ alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, md: 6 }, height: 68, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
        JobHunter
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <LanguageSwitcher />
        {status === 'authenticated' ? (
          <Button component={RouterLink} to="/board" variant="contained">
            {t('landing.openApp')}
          </Button>
        ) : (
          <>
            <Button component={RouterLink} to="/login" variant="text" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              {t('auth.login')}
            </Button>
            <Button component={RouterLink} to="/register" variant="contained">
              {t('landing.getStarted')}
            </Button>
          </>
        )}
      </Stack>
    </Stack>
  );
}

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <Box component="footer" sx={{ py: 4, px: 2, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        {t('landing.footer')}
      </Typography>
    </Box>
  );
}

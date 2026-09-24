import ChecklistIcon from '@mui/icons-material/Checklist';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlined';
import {
  AppBar,
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  ButtonBase,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, matchPath, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotify } from '../components/Notify';
import { countAttention } from '../features/todos/todoUtils';
import { useTodosQuery } from '../features/todos/useTodos';
import { useAppTheme } from '../theme/AppThemeProvider';
import { getErrorMessage } from '../utils/errors';
import { LanguageSwitcher } from './LanguageSwitcher';

const NAV_ITEMS: { to: string; labelKey: string; shortKey: string; icon: ReactNode }[] = [
  { to: '/', labelKey: 'nav.board', shortKey: 'nav.board', icon: <ViewKanbanOutlinedIcon /> },
  { to: '/interviews', labelKey: 'nav.interviews', shortKey: 'nav.interviewsShort', icon: <EventOutlinedIcon /> },
  { to: '/todos', labelKey: 'nav.todos', shortKey: 'nav.todosShort', icon: <ChecklistIcon /> },
  { to: '/cvs', labelKey: 'nav.cvs', shortKey: 'nav.cvs', icon: <DescriptionOutlinedIcon /> },
  { to: '/profile', labelKey: 'nav.profile', shortKey: 'nav.profile', icon: <PersonOutlineIcon /> },
];

/** Uzun metin olsa da ust bar ortali kalsin diye sol ve sag bloklar ayni genislikte. */
const SIDE_WIDTH = 240;

/**
 * Giris sonrasi tum sayfalarin iskeleti (tasarimdaki "B" yapisi):
 *  - Masaustu: ust bar; ortada kapsul seklinde sekmeli menu.
 *  - Mobil: ince ust bar + altta sabit ikonlu menu (telefonda basparmakla ulasilir; PWA icin de uygun).
 */
export function AppLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const attention = countAttention(useTodosQuery().data);

  const currentIndex = NAV_ITEMS.findIndex((item) => matchPath({ path: item.to, end: item.to === '/' }, location.pathname));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed">
        <Toolbar sx={{ gap: 2, px: { xs: 2, md: 3.5 } }}>
          <Box sx={{ width: { md: SIDE_WIDTH }, display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
            <Box
              component={RouterLink}
              to="/"
              aria-label={t('app.name')}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: 'text.primary', textDecoration: 'none' }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <WorkOutlineIcon sx={{ fontSize: 19 }} />
              </Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{t('app.name')}</Typography>
            </Box>
          </Box>

          {isDesktop ? (
            <Box
              component="nav"
              aria-label={t('nav.main')}
              sx={{ mx: 'auto', display: 'flex', gap: 0.25, p: 0.5, borderRadius: 999, bgcolor: 'app.surface2' }}
            >
              {NAV_ITEMS.map((item) => (
                <ButtonBase
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  end={item.to === '/'}
                  sx={(th) => ({
                    height: 38,
                    px: 2,
                    borderRadius: 999,
                    gap: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'text.secondary',
                    transition: 'background-color 120ms, color 120ms',
                    '&:hover': { color: 'text.primary' },
                    '&.active': { bgcolor: 'app.pill', color: 'text.primary', fontWeight: 700, boxShadow: th.palette.app.shadow },
                    '&.Mui-focusVisible': { outline: `2px solid ${th.palette.primary.main}`, outlineOffset: 2 },
                  })}
                >
                  {t(item.labelKey)}
                  {item.to === '/todos' && attention > 0 && <CountPill count={attention} />}
                </ButtonBase>
              ))}
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1 }} />
          )}

          <Box sx={{ width: { md: SIDE_WIDTH }, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, flexShrink: 0 }}>
            <ThemeToggle />
            {isDesktop && <LanguageSwitcher />}
            <UserMenu />
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          px: { xs: 2, md: 4 },
          pt: { xs: 2, md: 3.5 },
          // Mobilde alttaki menunun (64px + guvenli alan) arkasinda icerik kalmasin.
          pb: { xs: 'calc(88px + env(safe-area-inset-bottom))', md: 3 },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {!isDesktop && (
        <Paper
          component="nav"
          aria-label={t('nav.main')}
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: (th) => th.zIndex.appBar,
            borderWidth: '1px 0 0',
            borderRadius: 0,
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation showLabels value={currentIndex === -1 ? false : currentIndex} onChange={(_e, i: number) => navigate(NAV_ITEMS[i]!.to)}>
            {NAV_ITEMS.map((item) => (
              <BottomNavigationAction
                key={item.to}
                label={t(item.shortKey)}
                icon={
                  item.to === '/todos' ? (
                    <Badge badgeContent={attention} color="error" max={99}>
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )
                }
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}

function CountPill({ count }: { count: number }) {
  return (
    <Box
      component="span"
      sx={{
        minWidth: 20,
        height: 20,
        px: 0.75,
        boxSizing: 'border-box',
        borderRadius: 999,
        bgcolor: 'app.badge',
        color: '#fff',
        fontSize: 11.5,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {count > 99 ? '99+' : count}
    </Box>
  );
}

/** Hizli acik/koyu gecisi. Paleti ve "Sistem" secenegini Ayarlar sayfasindan degistirmek gerekir. */
function ThemeToggle() {
  const { t } = useTranslation();
  const notify = useNotify();
  const { scheme, setAppearance } = useAppTheme();
  const next = scheme === 'dark' ? 'Light' : 'Dark';
  const label = next === 'Dark' ? t('settings.switchToDark') : t('settings.switchToLight');

  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        onClick={() => setAppearance({ mode: next }).catch((e: unknown) => notify(getErrorMessage(e, t), 'error'))}
        sx={{ border: 1, borderColor: 'divider', width: 40, height: 40, color: 'text.secondary' }}
      >
        {scheme === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

function UserMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const initials = (user?.fullName ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toLocaleUpperCase())
    .join('');

  return (
    <>
      <Tooltip title={t('common.account')}>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ p: 0.25 }} aria-label={t('common.account')}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: 'app.accentSoft', color: 'app.accentText', fontSize: 13, fontWeight: 800 }}>
            {initials}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{user?.fullName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate('/settings');
          }}
        >
          <ListItemIcon>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          {t('nav.settings')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            void logout();
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {t('auth.logout')}
        </MenuItem>
      </Menu>
    </>
  );
}

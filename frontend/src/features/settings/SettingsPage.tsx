import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import DownloadForOfflineOutlinedIcon from '@mui/icons-material/DownloadForOfflineOutlined';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { Box, Button, ButtonBase, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { useNotify } from '../../components/Notify';
import { LanguageSwitcher } from '../../layout/LanguageSwitcher';
import { promptInstall, useInstallState } from '../../pwa/installPrompt';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { PALETTE_IDS, PALETTES, THEME_MODES, type ColorScheme, type PaletteId, type ThemeMode } from '../../theme/palettes';
import { getErrorMessage } from '../../utils/errors';

const MODE_ICONS: Record<ThemeMode, ReactNode> = {
  Light: <LightModeOutlinedIcon fontSize="small" />,
  Dark: <DarkModeOutlinedIcon fontSize="small" />,
  System: <DesktopWindowsOutlinedIcon fontSize="small" />,
};

/*
 * Ayarlar sayfasi. Secimler aninda uygulanir ve hesaba kaydedilir (ayri "Kaydet" butonu yok);
 * kayit basarisiz olursa tema eski haline doner ve hata gosterilir.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const notify = useNotify();
  const { user } = useAuth();
  const { appearance, scheme, setAppearance } = useAppTheme();

  const save = (next: { palette?: PaletteId; mode?: ThemeMode }) =>
    setAppearance(next)
      .then(() => notify(t('settings.appearanceSaved')))
      .catch((e: unknown) => notify(getErrorMessage(e, t), 'error'));

  return (
    <Box sx={{ maxWidth: 1280 }}>
      <Typography variant="h5">{t('nav.settings')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('settings.subtitle')}
      </Typography>

      {/* Genis ekranda (Windows masaustu) iki sutun: solda Gorunum, sagda Dil + Hesap. Dar ekranda alt alta. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        <Section title={t('settings.appearance')} description={t('settings.appearanceHint')}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }} id="palette-label">
            {t('settings.palette')}
          </Typography>
          <Box
            role="radiogroup"
            aria-labelledby="palette-label"
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, mb: 3 }}
          >
            {PALETTE_IDS.map((id) => (
              <PaletteOption
                key={id}
                id={id}
                scheme={scheme}
                selected={appearance.palette === id}
                onSelect={() => appearance.palette !== id && void save({ palette: id })}
              />
            ))}
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1.5 }} id="mode-label">
            {t('settings.mode')}
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={appearance.mode}
            aria-labelledby="mode-label"
            onChange={(_e, mode: ThemeMode | null) => mode && mode !== appearance.mode && void save({ mode })}
            sx={{ flexWrap: 'wrap' }}
          >
            {THEME_MODES.map((mode) => (
              <ToggleButton key={mode} value={mode} sx={{ gap: 1, px: 2.5, height: 44 }}>
                {MODE_ICONS[mode]}
                {t(`settings.modes.${mode}`)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {appearance.mode === 'System' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('settings.systemHint', { current: t(`settings.modes.${scheme === 'dark' ? 'Dark' : 'Light'}`) })}
            </Typography>
          )}
        </Section>

        <Stack spacing={2.5}>
          <Section title={t('common.language')} description={t('settings.languageHint')}>
            <LanguageSwitcher />
          </Section>

          <InstallSection />

          <Section title={t('settings.account')}>
            <Stack spacing={0.5}>
              <Typography sx={{ fontWeight: 700 }}>{user?.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Stack>
          </Section>
        </Stack>
      </Box>
    </Box>
  );
}

/**
 * Uygulama olarak yukleme (PWA). Tarayiciya gore dort durum:
 *  yuklu | yuklenebilir (Chrome/Edge: buton) | iPhone/iPad (elle adim) | desteklenmiyor/henuz hazir degil (menu ipucu)
 */
function InstallSection() {
  const { t } = useTranslation();
  const notify = useNotify();
  const { canInstall, installed, isIos } = useInstallState();

  const install = () =>
    promptInstall()
      .then((accepted) => accepted && notify(t('pwa.installedMessage')))
      .catch((e: unknown) => notify(getErrorMessage(e, t), 'error'));

  return (
    <Section title={t('pwa.section')} description={t('pwa.sectionHint')}>
      {installed ? (
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography sx={{ fontWeight: 600 }}>{t('pwa.installed')}</Typography>
        </Stack>
      ) : canInstall ? (
        <Button variant="contained" startIcon={<DownloadForOfflineOutlinedIcon />} onClick={() => void install()}>
          {t('pwa.install')}
        </Button>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {isIos ? t('pwa.iosHint') : t('pwa.browserHint')}
        </Typography>
      )}
    </Section>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: '20px' }}>
      <Typography variant="h6">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: 2.5 }}>{children}</Box>
    </Paper>
  );
}

/**
 * Tek palet secenegi: o paletin renkleriyle cizilmis kucuk bir uygulama onizlemesi.
 * Onizleme su anki moda (acik/koyu) gore cizilir; boylece secmeden once nasil gorunecegi anlasilir.
 */
function PaletteOption({ id, scheme, selected, onSelect }: { id: PaletteId; scheme: ColorScheme; selected: boolean; onSelect: () => void }) {
  const { t } = useTranslation();
  const c = PALETTES[id][scheme];

  return (
    <ButtonBase
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      sx={(th) => ({
        display: 'block',
        textAlign: 'left',
        borderRadius: '16px',
        p: 1,
        border: 2,
        borderColor: selected ? th.palette.primary.main : th.palette.divider,
        bgcolor: 'background.paper',
        transition: 'border-color 120ms',
        '&:hover': { borderColor: selected ? th.palette.primary.main : th.palette.text.secondary },
        '&.Mui-focusVisible': { outline: `2px solid ${th.palette.primary.main}`, outlineOffset: 2 },
      })}
    >
      {/* Mini onizleme: ust bar + menu kapsulu + iki kart + buton */}
      <Box aria-hidden sx={{ borderRadius: '10px', overflow: 'hidden', bgcolor: c.bg, border: `1px solid ${c.border}` }}>
        <Box sx={{ height: 18, bgcolor: c.surface, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 0.75, px: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.accent }} />
          <Box sx={{ mx: 'auto', width: 44, height: 8, borderRadius: 999, bgcolor: c.surface2 }} />
        </Box>
        <Box sx={{ p: 1, display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
          {[0, 1].map((i) => (
            <Box key={i} sx={{ flex: 1, bgcolor: c.surface, border: `1px solid ${c.border}`, borderRadius: '6px', p: 0.75 }}>
              <Box sx={{ width: '70%', height: 5, borderRadius: 999, bgcolor: c.text, opacity: 0.8, mb: 0.5 }} />
              <Box sx={{ width: '50%', height: 5, borderRadius: 999, bgcolor: c.muted, opacity: 0.6, mb: 0.75 }} />
              <Box sx={{ width: i === 0 ? '60%' : '40%', height: 8, borderRadius: 999, bgcolor: c.accentSoft }} />
            </Box>
          ))}
          <Box sx={{ width: 22, height: 12, borderRadius: 999, bgcolor: c.accent, flexShrink: 0 }} />
        </Box>
      </Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mt: 1, px: 0.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, flexGrow: 1 }}>{t(`palettes.${id}.name`)}</Typography>
        {selected && <CheckCircleIcon color="primary" sx={{ fontSize: 18 }} />}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 0.5, lineHeight: 1.35 }}>
        {t(`palettes.${id}.desc`)}
      </Typography>
    </ButtonBase>
  );
}

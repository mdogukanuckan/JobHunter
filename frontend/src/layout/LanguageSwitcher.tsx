import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '../i18n';

export function LanguageSwitcher({ color = 'inherit' }: { color?: 'inherit' | 'default' }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'tr') as AppLanguage;

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={current}
      aria-label={t('common.language')}
      onChange={(_, lng: AppLanguage | null) => lng && void i18n.changeLanguage(lng)}
      sx={color === 'inherit' ? { '& .MuiToggleButton-root': { color: 'inherit', borderColor: 'rgba(255,255,255,0.4)' } } : undefined}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <ToggleButton key={lng} value={lng} sx={{ px: 1.25, py: 0.25, fontWeight: 600 }}>
          {lng.toUpperCase()}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

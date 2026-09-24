import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '../i18n';

/** TR/EN secici. Ust bar artik acik zeminli oldugu icin ozel renk ayari gerekmiyor. */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'tr') as AppLanguage;

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={current}
      aria-label={t('common.language')}
      onChange={(_, lng: AppLanguage | null) => lng && void i18n.changeLanguage(lng)}
      sx={{ '& .MuiToggleButton-root': { height: 40 } }}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <ToggleButton key={lng} value={lng} sx={{ px: 1.5, fontSize: 13 }}>
          {lng.toUpperCase()}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

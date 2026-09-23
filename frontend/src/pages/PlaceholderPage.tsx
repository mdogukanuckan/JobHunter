import { Alert, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** 7b-7d modullerinde gercek sayfalarla degistirilecek. */
export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        {t(titleKey)}
      </Typography>
      <Alert severity="info">{t('common.comingSoon')}</Alert>
    </>
  );
}

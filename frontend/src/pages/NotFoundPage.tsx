import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 700 }} color="primary">
          404
        </Typography>
        <Typography sx={{ mb: 2 }}>{t('notFound.title')}</Typography>
        <Button component={RouterLink} to="/" variant="contained">
          {t('notFound.back')}
        </Button>
      </Box>
    </Box>
  );
}

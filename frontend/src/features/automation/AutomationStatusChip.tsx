import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { Chip, type ChipProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AutomationJobStatus } from '../../api/types';

/** Durum → MUI renk. Aktif durumlar dikkat ceker, bitmisler sakin. */
const COLORS: Record<AutomationJobStatus, ChipProps['color']> = {
  Queued: 'default',
  Running: 'info',
  AwaitingApproval: 'warning',
  Completed: 'success',
  Failed: 'error',
  Cancelled: 'default',
};

interface Props {
  status: AutomationJobStatus;
  /** Kartta robot ikonlu kucuk hali; panelde sadece metin. */
  withIcon?: boolean;
  size?: ChipProps['size'];
}

export function AutomationStatusChip({ status, withIcon = false, size = 'small' }: Props) {
  const { t } = useTranslation();
  return (
    <Chip
      size={size}
      color={COLORS[status]}
      variant={status === 'Cancelled' ? 'outlined' : 'filled'}
      icon={withIcon ? <SmartToyOutlinedIcon /> : undefined}
      label={t(`automation.status.${status}`)}
      title={withIcon ? t('automation.cardBadgeTitle', { status: t(`automation.status.${status}`) }) : undefined}
      sx={{ fontWeight: 600, '& .MuiChip-icon': { fontSize: 15 } }}
    />
  );
}

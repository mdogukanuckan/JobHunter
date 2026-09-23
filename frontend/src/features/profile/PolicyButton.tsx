import BlockIcon from '@mui/icons-material/Block';
import BoltIcon from '@mui/icons-material/Bolt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AutofillPolicy, PolicyField } from '../../api/types';
import { useNotify } from '../../components/Notify';
import { getErrorMessage } from '../../utils/errors';
import { DEFAULT_POLICIES, useProfileQuery, useUpdatePolicy } from './useProfile';

export const POLICY_META: Record<AutofillPolicy, { icon: ReactElement; color: 'success' | 'warning' | 'error' }> = {
  Auto: { icon: <BoltIcon fontSize="small" />, color: 'success' },
  AskFirst: { icon: <HelpOutlineIcon fontSize="small" />, color: 'warning' },
  Never: { icon: <BlockIcon fontSize="small" />, color: 'error' },
};

export const POLICIES: AutofillPolicy[] = ['Auto', 'AskFirst', 'Never'];

/**
 * Alanin yanindaki kucuk ikon: otomasyonun bu bilgiyi formlara nasil yazacagini gosterir ve degistirir.
 * Secim aninda kaydedilir (ayri "Kaydet" gerekmez).
 */
export function PolicyButton({ field, inline = false }: { field: PolicyField; /** Baslik satirinda (alan yaninda degil) */ inline?: boolean }) {
  const { t } = useTranslation();
  const notify = useNotify();
  const { data: profile } = useProfileQuery();
  const mutation = useUpdatePolicy();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const current = profile?.fieldPolicies[field] ?? DEFAULT_POLICIES[field];
  const meta = POLICY_META[current];

  const choose = (policy: AutofillPolicy) => {
    setAnchor(null);
    if (policy === current) return;
    mutation.mutate(
      { field, policy },
      { onError: (error) => notify(getErrorMessage(error, t), 'error') },
    );
  };

  return (
    <>
      <Tooltip title={`${t('policy.title')}: ${t(`policy.${current}`)}`}>
        <IconButton
          size="small"
          color={meta.color}
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={t('policy.title')}
          // Alan yanindayken 56px'lik TextField'in ortasina hizalanir.
          sx={{ mt: inline ? 0 : 1 }}
        >
          {meta.icon}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {POLICIES.map((p) => (
          <MenuItem key={p} selected={p === current} onClick={() => choose(p)}>
            <ListItemIcon sx={{ color: `${POLICY_META[p].color}.main` }}>{POLICY_META[p].icon}</ListItemIcon>
            <ListItemText primary={t(`policy.${p}`)} secondary={t(`policy.${p}Hint`)} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

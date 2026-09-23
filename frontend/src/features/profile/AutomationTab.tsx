import { Alert, Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { POLICY_FIELDS, type AutofillPolicy, type Profile } from '../../api/types';
import { useNotify } from '../../components/Notify';
import { getErrorMessage } from '../../utils/errors';
import { POLICIES, POLICY_META } from './PolicyButton';
import { DEFAULT_POLICIES, useUpdatePolicy } from './useProfile';

/** Tum otomasyon politikalarinin toplu gorunumu. Alanlarin yanindaki ikonlarla ayni veriyi degistirir. */
export function AutomationTab({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  const notify = useNotify();
  const mutation = useUpdatePolicy();
  const policies = profile?.fieldPolicies ?? DEFAULT_POLICIES;

  return (
    <Stack spacing={2}>
      <Alert severity="info">{t('policy.intro')}</Alert>

      <Paper>
        {POLICY_FIELDS.map((field, index) => (
          <Stack
            key={field}
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              alignItems: { sm: 'center' },
              gap: 1,
              px: 2,
              py: 1.5,
              borderTop: index === 0 ? 'none' : '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>{t(`policy.fields.${field}`)}</Typography>
              {policies[field] !== DEFAULT_POLICIES[field] && (
                <Typography variant="caption" color="text.secondary">
                  {t('policy.defaultIs', { value: t(`policy.${DEFAULT_POLICIES[field]}`) })}
                </Typography>
              )}
            </Box>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={policies[field]}
              onChange={(_e, value: AutofillPolicy | null) =>
                value &&
                mutation.mutate({ field, policy: value }, { onError: (error) => notify(getErrorMessage(error, t), 'error') })
              }
            >
              {POLICIES.map((p) => (
                <ToggleButton key={p} value={p} color={POLICY_META[p].color} sx={{ gap: 0.5, px: 1.5 }}>
                  {POLICY_META[p].icon}
                  {t(`policy.${p}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
        ))}
      </Paper>

      <Alert severity="warning">{t('policy.nationalIdNote')}</Alert>
    </Stack>
  );
}

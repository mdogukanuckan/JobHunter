import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { settingsApi } from '../../api/settings';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useNotify } from '../../components/Notify';
import { getErrorMessage } from '../../utils/errors';

const KIND = 'anthropic';
const secretKey = ['settings', 'secret', KIND] as const;

/*
 * Kullanicinin kendi Anthropic API anahtari. Guvenlik: anahtar sunucuya HTTPS ile gider, orada dogrulanip
 * SIFRELENEREK saklanir ve bir daha geri donmez; burada sadece "var mi" ve son 4 hane gorunur.
 * Girilen deger kaydedilir kaydedilmez (ve hata olsa da) state'ten silinir, tarayici depolamasina yazilmaz.
 */
export function ApiKeySection() {
  const { t } = useTranslation();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const status = useQuery({ queryKey: secretKey, queryFn: () => settingsApi.getSecret(KIND) });

  const save = useMutation({
    mutationFn: () => settingsApi.setSecret(KIND, value.trim()),
    onSuccess: (next) => {
      queryClient.setQueryData(secretKey, next);
      notify(t('settings.apiKey.saved'));
    },
    onError: (e: unknown) => notify(getErrorMessage(e, t), 'error'),
    onSettled: () => setValue(''),
  });

  const remove = useMutation({
    mutationFn: () => settingsApi.removeSecret(KIND),
    onSuccess: () => {
      queryClient.setQueryData(secretKey, { configured: false, last4: null });
      setConfirmRemove(false);
      notify(t('settings.apiKey.removed'));
    },
    onError: (e: unknown) => notify(getErrorMessage(e, t), 'error'),
  });

  const configured = status.data?.configured ?? false;

  return (
    <>
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <KeyOutlinedIcon fontSize="small" color={configured ? 'primary' : 'disabled'} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {configured ? t('settings.apiKey.configured', { last4: status.data?.last4 }) : t('settings.apiKey.notConfigured')}
          </Typography>
        </Stack>

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) save.mutate();
          }}
        >
          <Stack spacing={1.5}>
            <TextField
              label={t('settings.apiKey.label')}
              placeholder={t('settings.apiKey.placeholder')}
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              fullWidth
              size="small"
              // Tarayicinin parola yoneticisi/otomatik doldurma bu alana dokunmasin; anahtar baska yerde saklanmasin.
              slotProps={{ htmlInput: { autoComplete: 'off', spellCheck: false, 'data-lpignore': 'true' } }}
            />
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Button type="submit" variant="contained" disabled={!value.trim()} loading={save.isPending}>
                {configured ? t('settings.apiKey.replace') : t('settings.apiKey.save')}
              </Button>
              {configured && (
                <Button color="error" onClick={() => setConfirmRemove(true)}>
                  {t('settings.apiKey.remove')}
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        <Link href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" variant="body2">
          {t('settings.apiKey.get')}
        </Link>
      </Stack>

      <ConfirmDialog
        open={confirmRemove}
        title={t('settings.apiKey.title')}
        message={t('settings.apiKey.removeConfirm')}
        confirmLabel={t('settings.apiKey.remove')}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmRemove(false)}
      />
    </>
  );
}

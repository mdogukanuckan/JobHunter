import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../layout/AuthLayout';
import { getErrorMessage } from '../utils/errors';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // useMutation: istek durumunu (isPending, error) bizim yerimize tutar.
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      // Korumali bir sayfadan yonlendirildiysek oraya geri don.
      const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email: email.trim(), password });
  };

  return (
    <AuthLayout title={t('auth.loginTitle')}>
      <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
        {sessionExpired && !mutation.error && <Alert severity="info">{t('auth.sessionExpired')}</Alert>}
        {mutation.error && <Alert severity="error">{getErrorMessage(mutation.error, t)}</Alert>}
        <TextField
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          fullWidth
        />
        <TextField
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" loading={mutation.isPending}>
          {t('auth.login')}
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          {t('auth.noAccount')}{' '}
          <Link component={RouterLink} to="/register">
            {t('auth.register')}
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
}

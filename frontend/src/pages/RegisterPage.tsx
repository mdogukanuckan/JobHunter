import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../layout/AuthLayout';
import { getErrorMessage } from '../utils/errors';

const MIN_PASSWORD_LENGTH = 8;

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => navigate('/', { replace: true }),
  });

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) return;
    mutation.mutate({ fullName: fullName.trim(), email: email.trim(), password });
  };

  return (
    <AuthLayout title={t('auth.registerTitle')}>
      <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
        {mutation.error && <Alert severity="error">{getErrorMessage(mutation.error, t)}</Alert>}
        <TextField
          label={t('auth.fullName')}
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoFocus
          fullWidth
        />
        <TextField
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordTooShort}
          helperText={t('auth.passwordHint')}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" loading={mutation.isPending}>
          {t('auth.register')}
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          {t('auth.haveAccount')}{' '}
          <Link component={RouterLink} to="/login">
            {t('auth.login')}
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
}

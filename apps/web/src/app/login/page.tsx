'use client';
import { Box, Button, Paper, TextField, Typography, Alert, Link as MuiLink } from '@mui/material';
import { useState } from 'react';
import { useLoginMutation } from '../../state/services/auth';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../state/slices/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRedirecting = useAuthRedirect();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const res = await login({ email, password }).unwrap();
      dispatch(setCredentials({ accessToken: res.accessToken, user: res.user }));

      const next = searchParams.get('next');
      router.push(next || '/dashboard');
    } catch (err) {
      const error = err as { status?: number; data?: { message?: string } };
      if (error.status === 401) {
        setError('Invalid email or password');
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  // Don't show login form if user is already authenticated
  if (isRedirecting) return null;

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'grey.50' }}>
      <Paper elevation={3} sx={{ p: 4, width: 400, maxWidth: '100%' }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Sign in to SaaS Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your credentials to access your account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Box sx={{ mt: 1, textAlign: 'right' }}>
            <MuiLink component={Link} href="/forgot-password" underline="hover" variant="body2">
              Forgot password?
            </MuiLink>
          </Box>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don&apos;t have an account?{' '}
            <MuiLink component={Link} href="/register" underline="hover">
              Sign up
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
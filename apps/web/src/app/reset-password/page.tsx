'use client';
import { Box, Paper, Typography, Alert, Button, TextField } from '@mui/material';
import { useState } from 'react';
import { useResetPasswordMutation } from '../../state/services/auth';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setStatus('error');
      setErrorMessage('Reset token is missing');
      return;
    }

    if (!password || !confirmPassword) {
      setErrorMessage('Please enter and confirm your new password');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    try {
      await resetPassword({ token, password }).unwrap();
      setStatus('success');
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setStatus('error');
      const error = err as { data?: { message?: string } };
      setErrorMessage(
        error.data?.message ||
          'Password reset failed. The link may be invalid or expired.'
      );
    }
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'grey.50' }}>
        <Paper elevation={3} sx={{ p: 4, width: 400, maxWidth: '100%', textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom fontWeight={600} color="error.main">
            Invalid Link
          </Typography>
          <Alert severity="error" sx={{ mt: 2, mb: 3 }}>
            This password reset link is invalid or missing.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please request a new password reset link.
          </Typography>
          <Button
            component={Link}
            href="/forgot-password"
            variant="contained"
            fullWidth
            sx={{ mb: 1 }}
          >
            Request New Link
          </Button>
          <Button
            component={Link}
            href="/login"
            variant="outlined"
            fullWidth
          >
            Back to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  if (status === 'success') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'grey.50' }}>
        <Paper elevation={3} sx={{ p: 4, width: 400, maxWidth: '100%', textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom fontWeight={600} color="success.main">
            Password reset!
          </Typography>
          <Alert severity="success" sx={{ mt: 2, mb: 3 }}>
            Your password has been successfully reset.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You can now log in with your new password. Redirecting to login page...
          </Typography>
          <Button
            component={Link}
            href="/login"
            variant="contained"
            fullWidth
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'grey.50' }}>
      <Paper elevation={3} sx={{ p: 4, width: 400, maxWidth: '100%' }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Reset your password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your new password below.
        </Typography>

        {status === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStatus('idle')}>
            {errorMessage}
          </Alert>
        )}

        {errorMessage && status !== 'error' && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            helperText="Must be at least 8 characters"
            autoFocus
            required
          />
          <TextField
            label="Confirm Password"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? 'Resetting password...' : 'Reset password'}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Remember your password?{' '}
            <Link href="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

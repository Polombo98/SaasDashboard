'use client';
import { Box, Button, Paper, TextField, Typography, Alert, Link as MuiLink } from '@mui/material';
import { useState } from 'react';
import { useForgotPasswordMutation } from '../../state/services/auth';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      await forgotPassword({ email }).unwrap();
      setSuccess(true);
    } catch (err) {
      const error = err as { data?: { message?: string } };
      setError(error.data?.message || 'Failed to send reset email. Please try again.');
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'grey.50' }}>
        <Paper elevation={3} sx={{ p: 4, width: 400, maxWidth: '100%' }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Check your email
          </Typography>

          <Alert severity="success" sx={{ mt: 2, mb: 3 }}>
            If an account exists with <strong>{email}</strong>, we&apos;ve sent password reset instructions.
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please check your email and follow the link to reset your password. The link will expire in 1 hour.
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Didn&apos;t receive the email? Check your spam folder or try again.
          </Typography>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <MuiLink component={Link} href="/login" underline="hover">
              Back to login
            </MuiLink>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'grey.50' }}>
      <Paper elevation={3} sx={{ p: 4, width: 400, maxWidth: '100%' }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Forgot password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your email address and we&apos;ll send you instructions to reset your password.
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
            required
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Remember your password?{' '}
            <MuiLink component={Link} href="/login" underline="hover">
              Sign in
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

'use client';
import { Box, Button, Paper, TextField, Typography, Alert, Link as MuiLink } from '@mui/material';
import { useState } from 'react';
import { useRegisterMutation } from '../../state/services/auth';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [register, { isLoading }] = useRegisterMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      await register({ email, password, name: name || undefined }).unwrap();
      setSuccess(true);
    } catch (err) {
      const error = err as { status?: number; data?: { message?: string } };
      if (error.status === 409) {
        setError('An account with this email already exists');
      } else if (error.data?.message) {
        setError(error.data.message);
      } else {
        setError('Registration failed. Please try again.');
      }
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
            We&apos;ve sent a verification link to <strong>{email}</strong>
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please click the link in the email to verify your account. The link will expire in 24 hours.
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <MuiLink component={Link} href="/login" underline="hover">
              try logging in
            </MuiLink>
            .
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
          Create your account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign up to get started with SaaS Dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <TextField
            label="Name (optional)"
            type="text"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoFocus
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            helperText="Must be at least 8 characters"
            required
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <MuiLink component={Link} href="/login" underline="hover">
              Sign in
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

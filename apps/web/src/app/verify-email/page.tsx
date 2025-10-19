'use client';
import { Box, Paper, Typography, Alert, Button, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { useVerifyEmailMutation } from '../../state/services/auth';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const isRedirecting = useAuthRedirect();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing');
      return;
    }

    // Verify email
    verifyEmail({ token })
      .unwrap()
      .then(() => {
        setStatus('success');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      })
      .catch((err) => {
        setStatus('error');
        const error = err as { data?: { message?: string } };
        setErrorMessage(
          error.data?.message ||
            'Verification failed. The link may be invalid or expired.'
        );
      });
  }, [searchParams, verifyEmail, router]);

  // Don't show verify email form if user is already authenticated
  if (isRedirecting) return null;

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'grey.50' }}>
      <Paper elevation={3} sx={{ p: 4, width: 400, maxWidth: '100%', textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Verifying your email...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we verify your email address.
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Typography variant="h5" gutterBottom fontWeight={600} color="success.main">
              Email verified!
            </Typography>
            <Alert severity="success" sx={{ mt: 2, mb: 3 }}>
              Your email has been successfully verified.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You can now log in to your account. Redirecting to login page...
            </Typography>
            <Button
              component={Link}
              href="/login"
              variant="contained"
              fullWidth
            >
              Go to Login
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <Typography variant="h5" gutterBottom fontWeight={600} color="error.main">
              Verification failed
            </Typography>
            <Alert severity="error" sx={{ mt: 2, mb: 3 }}>
              {errorMessage}
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The verification link may have expired or is invalid. Please try registering again or contact support.
            </Typography>
            <Button
              component={Link}
              href="/register"
              variant="contained"
              fullWidth
              sx={{ mb: 1 }}
            >
              Register Again
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              fullWidth
            >
              Back to Login
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}

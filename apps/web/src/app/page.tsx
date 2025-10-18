'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '../state/store';
import { Box, CircularProgress } from '@mui/material';

export default function Home() {
  const router = useRouter();
  const { accessToken, bootstrapped } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (!bootstrapped) return;

    if (accessToken) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [accessToken, bootstrapped, router]);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

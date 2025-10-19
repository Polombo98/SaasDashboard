import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import type { RootState } from '../state/store';

/**
 * Hook to redirect authenticated users away from auth pages.
 * Use this on pages like login, register, forgot-password, etc.
 *
 * @param redirectTo - The path to redirect to if user is authenticated (default: '/dashboard')
 * @returns boolean indicating if the app is still loading/bootstrapping
 */
export function useAuthRedirect(redirectTo: string = '/dashboard'): boolean {
  const router = useRouter();
  const { accessToken, bootstrapped } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (!bootstrapped) return; // Wait for refresh attempt
    if (accessToken) {
      router.replace(redirectTo);
    }
  }, [accessToken, bootstrapped, redirectTo, router]);

  // Return true if still loading (not bootstrapped or has token but hasn't redirected yet)
  return !bootstrapped || !!accessToken;
}

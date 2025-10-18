'use client';
import { useSelector } from 'react-redux';
import type { RootState } from '../state/store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, bootstrapped } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (!bootstrapped) return;            // wait for refresh attempt
    if (!accessToken) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [accessToken, bootstrapped, pathname, router]);

  if (!bootstrapped) return null;         // prevent flash
  if (!accessToken) return null;

  return <>{children}</>;
}
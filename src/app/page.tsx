'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (user?.role === 'ADMIN' || user?.profileCompleted) router.replace('/dashboard');
    else router.replace('/complete-profile');
  }, [loading, token, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sky-blue-soft)]">
      <div className="text-center text-[var(--foreground)]">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[var(--sky-blue)] border-r-transparent" />
        <p className="mt-4 text-lg">Chargement…</p>
      </div>
    </div>
  );
}

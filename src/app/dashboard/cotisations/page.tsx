'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CotisationsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/cotisations/mensuelle');
  }, [router]);
  return null;
}

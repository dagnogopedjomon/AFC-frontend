'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function CompteSuspenduPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/dashboard/regulariser');
    } else {
      router.replace('/login');
    }
  }, [user, router]);

  return (
    <div className="brand-grid min-h-screen flex items-center justify-center bg-[var(--secondary)] px-4">
      <div className="card w-full max-w-md shadow-xl border border-[var(--afc-badge-amber-border)] bg-[var(--afc-badge-amber-bg)]/50 text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--afc-badge-amber-bg)] text-[var(--afc-badge-amber-text)]">
            <AlertCircle size={32} />
          </div>
        </div>
        <h1 className="font-serif text-[22px] text-[var(--afc-badge-amber-text)]">
          Compte suspendu
        </h1>
        <p className="mt-4 text-[var(--afc-badge-amber-text)]">
          Votre compte est suspendu pour non-paiement. Vous n'avez pas accès au tableau de bord.
        </p>
        <p className="mt-2 text-[var(--afc-badge-amber-text)] font-medium">
          Contactez l'administrateur pour régulariser votre situation et réactiver votre compte.
        </p>
      </div>
    </div>
  );
}

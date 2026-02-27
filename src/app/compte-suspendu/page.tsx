'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function CompteSuspenduPage() {
  const { clearSession } = useAuth();

  useEffect(() => {
    clearSession();
  }, [clearSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-800 px-4">
      <div className="card w-full max-w-md shadow-xl border border-amber-200 bg-amber-50/50 text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertCircle size={32} />
          </div>
        </div>
        <h1 className="text-xl font-bold text-amber-900">
          Compte suspendu
        </h1>
        <p className="mt-4 text-amber-800">
          Votre compte est suspendu pour non-paiement. Vous n'avez pas accès au tableau de bord.
        </p>
        <p className="mt-2 text-amber-800 font-medium">
          Contactez l'administrateur pour régulariser votre situation et réactiver votre compte.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block px-6 py-3 rounded-xl bg-[var(--sky-blue)] text-white font-medium hover:opacity-90 transition"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, type Contribution } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { JekoPayButton } from '@/components/JekoPayButton';

export default function CotisationMensuellePage() {
  const { user } = useAuth();
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    contributionsApi.monthly()
      .then(setMonthly)
      .catch(() => setMonthly(null))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--sky-blue)]" />
      </div>
    );
  }

  if (!monthly) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/dashboard/cotisations" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Cotisations</Link>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mt-2">Cotisation mensuelle</h1>
        </div>
        <div className="card text-center py-12">
          <p className="text-gray-500">Aucune cotisation mensuelle définie pour l'instant.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/cotisations" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Cotisations</Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mt-2">Cotisation mensuelle</h1>
        <p className="text-gray-600 mt-1">Échéance le 10 de chaque mois.</p>
      </div>

      <div className="card border-l-4 border-l-[var(--sky-blue)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{monthly.name}</h2>
        <p className="text-3xl font-bold text-[var(--sky-blue)] mt-2">
          {monthly.amount ? Number(monthly.amount).toLocaleString('fr-FR') : '0'} FCFA
          <span className="text-sm font-normal text-gray-500">/mois</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Période en cours : {new Date(currentYear, currentMonth - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="card">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Payer ma cotisation</h2>
        <JekoPayButton
          contributionId={monthly.id}
          amount={monthly.amount ? Number(monthly.amount) : 0}
          periodYear={currentYear}
          periodMonth={currentMonth}
          label={monthly.amount ? `${Number(monthly.amount).toLocaleString('fr-FR')} FCFA` : undefined}
          onError={(msg) => toast.error(msg)}
        />
      </div>
    </div>
  );
}

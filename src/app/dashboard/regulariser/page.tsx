'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { contributionsApi, type Contribution } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { JekoPayButton } from '@/components/JekoPayButton';

export default function RegulariserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [debtSummary, setDebtSummary] = useState<{
    totalOwed: number;
    monthlyAmount: number;
    unpaidMonths: Array<{ year: number; month: number; amount: number; label: string }>;
    monthlyContributionId: string | null;
  } | null>(null);
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    contributionsApi
      .meDebtSummary()
      .then((data) => {
        setDebtSummary(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (debtSummary?.monthlyContributionId) {
      contributionsApi
        .monthly()
        .then((c) => setMonthly(c))
        .catch(() => setMonthly(null));
    }
  }, [debtSummary?.monthlyContributionId]);

  useEffect(() => {
    if (debtSummary && debtSummary.unpaidMonths.length === 0 && !loading) {
      router.replace('/dashboard');
    }
  }, [debtSummary, loading, router]);

  if (loading && (!debtSummary || debtSummary.unpaidMonths.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
      </div>
    );
  }

  if (!debtSummary || debtSummary.unpaidMonths.length === 0) {
    return null;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="card border-l-4 border-l-amber-500 bg-amber-50/50">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertCircle size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">
              Régulariser vos cotisations
            </h1>
            <p className="text-amber-800 mt-1">
              Vous devez régler <strong>tous</strong> les mois ci-dessous pour retrouver l&apos;accès à votre compte.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
          Montant total dû
        </h2>
        <p className="text-3xl font-bold text-[var(--foreground)] mb-4">
          {debtSummary.totalOwed.toLocaleString('fr-FR')} FCFA
        </p>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
          Mois à régulariser ({debtSummary.unpaidMonths.length})
        </h2>
        <ul className="space-y-1.5 text-sm text-gray-700 mb-4">
          {debtSummary.unpaidMonths.map((m) => (
            <li key={`${m.year}-${m.month}`} className="flex justify-between font-medium">
              <span>{m.label}</span>
              <span>{m.amount.toLocaleString('fr-FR')} FCFA</span>
            </li>
          ))}
        </ul>
        {monthly && (
          <p className="text-sm text-gray-600">
            Cotisation : <strong>{monthly.name}</strong>
            {monthly.amount != null && ` — ${Number(monthly.amount).toLocaleString('fr-FR')} FCFA / mois`}
          </p>
        )}
      </div>

      {debtSummary.monthlyContributionId && monthly && (
        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Payer en ligne</h2>
          <JekoPayButton
            contributionId={debtSummary.monthlyContributionId}
            amount={debtSummary.totalOwed}
            periodYear={debtSummary.unpaidMonths[0]?.year}
            periodMonth={debtSummary.unpaidMonths[0]?.month}
            defaultPhone={user?.phone ?? ''}
            label={`${debtSummary.totalOwed.toLocaleString('fr-FR')} FCFA (${debtSummary.unpaidMonths.length} mois)`}
            onError={setError}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

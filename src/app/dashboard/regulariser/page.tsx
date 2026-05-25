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
  const [unpaidMonths, setUnpaidMonths] = useState<Array<{ year: number; month: number }>>([]);
  const [monthlyContributionId, setMonthlyContributionId] = useState<string | null>(null);
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    contributionsApi
      .meUnpaidMonths()
      .then((data) => {
        setUnpaidMonths(data.unpaidMonths);
        setMonthlyContributionId(data.monthlyContributionId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (monthlyContributionId) {
      contributionsApi
        .monthly()
        .then((c) => setMonthly(c))
        .catch(() => setMonthly(null));
    }
  }, [monthlyContributionId]);

  useEffect(() => {
    if (unpaidMonths.length === 0 && !loading) {
      router.replace('/dashboard');
    }
  }, [unpaidMonths.length, loading, router]);

  const now = new Date();
  const isCurrentMonth = (y: number, m: number) => y === now.getFullYear() && m === now.getMonth() + 1;

  if (loading && unpaidMonths.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
      </div>
    );
  }

  if (unpaidMonths.length === 0) {
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
          Mois à régulariser ({unpaidMonths.length})
        </h2>
        <ul className="space-y-1.5 text-sm text-gray-700 mb-4">
          {unpaidMonths.slice(0, 12).map((m) => (
            <li key={`${m.year}-${m.month}`} className="font-medium">
              {new Date(m.year, m.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
              {isCurrentMonth(m.year, m.month) && (
                <span className="ml-2 text-amber-700 text-xs font-semibold">(mois en cours)</span>
              )}
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

      {monthlyContributionId && monthly && (
        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Payer en ligne</h2>
          <JekoPayButton
            contributionId={monthlyContributionId}
            amount={Number(monthly.amount) * unpaidMonths.length}
            periodYear={unpaidMonths[0]?.year}
            periodMonth={unpaidMonths[0]?.month}
            defaultPhone={user?.phone ?? ''}
            label={`${(Number(monthly.amount) * unpaidMonths.length).toLocaleString('fr-FR')} FCFA (${unpaidMonths.length} mois)`}
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

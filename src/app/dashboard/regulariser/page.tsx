'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { contributionsApi, type Contribution } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function RegulariserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [unpaidMonths, setUnpaidMonths] = useState<Array<{ year: number; month: number }>>([]);
  const [monthlyContributionId, setMonthlyContributionId] = useState<string | null>(null);
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cinetPayLoading, setCinetPayLoading] = useState(false);
  const [amount, setAmount] = useState(5000);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    contributionsApi
      .meUnpaidMonths()
      .then((data) => {
        setUnpaidMonths(data.unpaidMonths);
        setMonthlyContributionId(data.monthlyContributionId);
        if (data.unpaidMonths.length > 0) {
          const first = data.unpaidMonths[0];
          setPeriodYear(first.year);
          setPeriodMonth(first.month);
        }
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
        .then((c) => {
          setMonthly(c);
          if (c.amount != null) setAmount(Number(c.amount));
        })
        .catch(() => setMonthly(null));
    }
  }, [monthlyContributionId]);

  useEffect(() => {
    if (unpaidMonths.length === 0 && !loading) {
      router.replace('/dashboard');
    }
  }, [unpaidMonths.length, loading, router]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isCurrentMonth = (y: number, m: number) => y === currentYear && m === currentMonth;
  const isPaidForSelected =
    unpaidMonths.findIndex((m) => m.year === periodYear && m.month === periodMonth) === -1;

  async function handleCinetPay(e: React.FormEvent) {
    e.preventDefault();
    if (!monthlyContributionId || !monthly || isPaidForSelected) return;
    setError(null);
    setCinetPayLoading(true);
    try {
      const { paymentUrl } = await contributionsApi.initCinetPay({
        contributionId: monthlyContributionId,
        amount,
        periodYear,
        periodMonth,
      });
      window.location.href = paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CinetPay indisponible.');
    } finally {
      setCinetPayLoading(false);
    }
  }

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
              Pour retrouver l'accès à votre compte, vous devez régler <strong>tous</strong> les mois ci-dessous : <strong>mois passés impayés + mois en cours</strong>. Un paiement par mois ; après chaque paiement, revenez ici pour régler le suivant si besoin.
            </p>
            <p className="text-amber-700 mt-2 text-sm">
              Si vous ne payez qu'un seul mois alors qu'il vous en reste d'autres, vous n'aurez pas encore accès : réglez tous les mois listés.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
          Mois à régulariser — tous obligatoires ({unpaidMonths.length})
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
      </div>

      {monthly && (
        <div className="card border-l-4 border-l-emerald-500">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Payer un mois
          </h2>
          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleCinetPay} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cotisation</label>
              <p className="text-[var(--foreground)] font-medium">{monthly.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Période</label>
              <div className="flex gap-2">
                <select
                  className="input-field flex-1"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  className="input-field flex-1"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(parseInt(e.target.value, 10))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant (FCFA)</label>
              <input
                type="number"
                min="1"
                step="1"
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </div>
            {isPaidForSelected && (
              <p className="text-amber-700 text-sm font-medium">
                Ce mois est déjà réglé. Choisissez un mois de la liste « Mois à régulariser » ci-dessus.
              </p>
            )}
            <button
              type="submit"
              disabled={cinetPayLoading || isPaidForSelected}
              className="btn-primary w-full disabled:opacity-60"
            >
              {cinetPayLoading ? 'Redirection vers CinetPay…' : 'Payer ce mois avec CinetPay'}
            </button>
          </form>
        </div>
      )}

      {!monthly && monthlyContributionId && (
        <div className="rounded-xl bg-amber-50 text-amber-800 px-4 py-3 text-sm">
          Chargement de la cotisation…
        </div>
      )}
    </div>
  );
}

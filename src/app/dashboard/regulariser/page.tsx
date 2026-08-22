'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { contributionsApi, regularizationsApi, type Contribution, type RegularizationAgreement } from '@/lib/api';
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
  const [agreement, setAgreement] = useState<RegularizationAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      contributionsApi.meDebtSummary(),
      regularizationsApi.myActive().catch(() => null),
    ])
      .then(([data, activeAgreement]) => {
        setDebtSummary(data);
        setAgreement(activeAgreement);
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
    if (debtSummary && debtSummary.unpaidMonths.length === 0 && !agreement && !loading) {
      router.replace('/dashboard');
    }
  }, [debtSummary, agreement, loading, router]);

  if (loading && (!debtSummary || debtSummary.unpaidMonths.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
      </div>
    );
  }

  if (!debtSummary) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card border-l-4 border-l-red-500">
          <h1 className="text-lg font-bold text-[var(--foreground)]">Impossible d’afficher votre dette</h1>
          <p className="mt-2 text-sm text-red-700">{error ?? 'Le détail des cotisations est temporairement indisponible.'}</p>
          <button type="button" onClick={fetchData} className="btn-primary mt-4">Réessayer</button>
        </div>
      </div>
    );
  }

  if (debtSummary.unpaidMonths.length === 0 && !agreement) {
    return null;
  }

  const paymentAmount = agreement
    ? agreement.paidAmount === 0 ? agreement.initialAmount : agreement.balance
    : debtSummary.totalOwed;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertCircle size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[var(--foreground)]">Régulariser vos cotisations</h1>
          <p className="text-sm text-amber-800">
            {agreement ? 'Votre accord administrateur est appliqué au montant à payer.' : 'Consultez vos mois impayés et réglez votre dette pour retrouver l’accès.'}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <div className="card space-y-4">
          <div className="flex items-end justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{agreement ? 'Dette initiale' : 'Montant total dû'}</p>
              <p className="mt-1 text-3xl font-bold text-[var(--foreground)]">{debtSummary.totalOwed.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{debtSummary.unpaidMonths.length} mois</span>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Détail des mois</h2>
            <ul className="divide-y divide-gray-100 text-sm">
              {debtSummary.unpaidMonths.map((month) => (
                <li key={`${month.year}-${month.month}`} className="flex justify-between py-2 font-medium">
                  <span>{month.label}</span><span>{month.amount.toLocaleString('fr-FR')} FCFA</span>
                </li>
              ))}
            </ul>
          </div>
          {monthly && <p className="text-xs text-gray-500">{monthly.name} · {Number(monthly.amount).toLocaleString('fr-FR')} FCFA / mois</p>}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="card space-y-4 border-t-4 border-t-[var(--sky-blue)]">
            {agreement ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">Accord de régularisation</h2>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{agreement.mode === 'INSTALLMENT' ? 'Paiement par tranches' : 'Règlement négocié'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-4">
                  <div><span className="text-gray-500">Accordé</span><p className="font-bold">{agreement.agreedAmount.toLocaleString('fr-FR')}</p></div>
                  <div><span className="text-gray-500">Remise</span><p className="font-bold text-green-700">{agreement.discountAmount.toLocaleString('fr-FR')}</p></div>
                  <div><span className="text-gray-500">Payé</span><p className="font-bold text-green-700">{agreement.paidAmount.toLocaleString('fr-FR')}</p></div>
                  <div><span className="text-gray-500">Solde</span><p className="font-bold text-amber-700">{agreement.balance.toLocaleString('fr-FR')} FCFA</p></div>
                </div>
                {agreement.deadline && <p className="text-sm text-gray-700">Échéance du solde : <strong>{new Date(agreement.deadline).toLocaleDateString('fr-FR')}</strong></p>}
                {agreement.notes && <p className="text-sm text-gray-600">Note : {agreement.notes}</p>}
              </>
            ) : null}

            <div className={agreement ? 'border-t border-gray-100 pt-4' : ''}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">À payer maintenant</p>
              <p className="mt-1 text-3xl font-bold text-[var(--sky-blue-dark)]">{paymentAmount.toLocaleString('fr-FR')} FCFA</p>
            </div>

            {debtSummary.monthlyContributionId && monthly && (
              <JekoPayButton
                contributionId={debtSummary.monthlyContributionId}
                amount={paymentAmount}
                periodYear={debtSummary.unpaidMonths[0]?.year}
                periodMonth={debtSummary.unpaidMonths[0]?.month}
                defaultPhone={user?.phone ?? ''}
                label={`${paymentAmount.toLocaleString('fr-FR')} FCFA`}
                regularizationAgreementId={agreement?.id}
                onError={setError}
              />
            )}
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        </div>
      </div>
    </div>
  );
}

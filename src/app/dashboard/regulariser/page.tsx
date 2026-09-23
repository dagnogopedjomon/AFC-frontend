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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
      </div>
    );
  }

  if (!debtSummary) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-xl border border-[var(--afc-border)] border-l-4 border-l-red-500 bg-[var(--afc-card)] p-5">
          <h1 className="text-lg font-semibold text-[var(--afc-text)]">Impossible d&rsquo;afficher votre dette</h1>
          <p className="mt-2 text-sm text-red-400">{error ?? 'Le détail des cotisations est temporairement indisponible.'}</p>
          <button type="button" onClick={fetchData} className="afc-button-primary mt-4">Réessayer</button>
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
      <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--afc-badge-amber-border)', background: 'var(--afc-badge-amber-bg)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--afc-badge-amber-border)', color: 'var(--afc-badge-amber-text)' }}>
          <AlertCircle size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-[var(--afc-text)]">Régulariser vos cotisations</h1>
          <p className="text-sm" style={{ color: 'var(--afc-badge-amber-text)' }}>
            {agreement ? 'Votre accord administrateur est appliqué au montant à payer.' : 'Consultez vos mois impayés et réglez votre dette pour retrouver l’accès.'}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <div className="space-y-4 rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
          <div className="flex items-end justify-between gap-4 border-b border-[var(--afc-border)] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--afc-muted)]">{agreement ? 'Dette initiale' : 'Montant total dû'}</p>
              <p className="mt-1 text-3xl font-semibold text-[var(--afc-text)]">{debtSummary.totalOwed.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <span className="afc-badge-amber rounded-full border px-3 py-1 text-sm font-semibold">{debtSummary.unpaidMonths.length} mois</span>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--afc-muted)]">Détail des mois</h2>
            <ul className="divide-y divide-[rgba(var(--afc-hl),0.06)] text-sm">
              {debtSummary.unpaidMonths.map((month) => (
                <li key={`${month.year}-${month.month}`} className="flex justify-between py-2 font-medium text-[var(--afc-text-soft)]">
                  <span>{month.label}</span><span>{month.amount.toLocaleString('fr-FR')} FCFA</span>
                </li>
              ))}
            </ul>
          </div>
          {monthly && <p className="text-xs text-[var(--afc-muted)]">{monthly.name} · {Number(monthly.amount).toLocaleString('fr-FR')} FCFA / mois</p>}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="space-y-4 overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
            {agreement ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-[var(--afc-text)]">Accord de régularisation</h2>
                  <span className="afc-badge-blue rounded-full border px-3 py-1 text-xs font-semibold">{agreement.mode === 'INSTALLMENT' ? 'Paiement par tranches' : 'Règlement négocié'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] p-3 text-sm sm:grid-cols-4">
                  <div><span className="text-[var(--afc-muted)]">Accordé</span><p className="font-bold text-[var(--afc-text)]">{agreement.agreedAmount.toLocaleString('fr-FR')}</p></div>
                  <div><span className="text-[var(--afc-muted)]">Remise</span><p className="font-bold text-emerald-400">{agreement.discountAmount.toLocaleString('fr-FR')}</p></div>
                  <div><span className="text-[var(--afc-muted)]">Payé</span><p className="font-bold text-emerald-400">{agreement.paidAmount.toLocaleString('fr-FR')}</p></div>
                  <div><span className="text-[var(--afc-muted)]">Solde</span><p className="font-bold text-amber-400">{agreement.balance.toLocaleString('fr-FR')} FCFA</p></div>
                </div>
                {agreement.deadline && <p className="text-sm text-[var(--afc-text-soft)]">Échéance du solde : <strong>{new Date(agreement.deadline).toLocaleDateString('fr-FR')}</strong></p>}
                {agreement.notes && <p className="text-sm text-[var(--afc-muted-2)]">Note : {agreement.notes}</p>}
              </>
            ) : null}

            <div className={agreement ? 'border-t border-[var(--afc-border)] pt-4' : ''}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--afc-muted)]">À payer maintenant</p>
              <p className="mt-1 text-3xl font-semibold text-[#C9A048]">{paymentAmount.toLocaleString('fr-FR')} FCFA</p>
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

          {error && <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}
        </div>
      </div>
    </div>
  );
}

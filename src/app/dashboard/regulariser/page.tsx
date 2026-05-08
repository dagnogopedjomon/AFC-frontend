'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { contributionsApi, type Contribution } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function RegulariserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unpaidMonths, setUnpaidMonths] = useState<Array<{ year: number; month: number }>>([]);
  const [monthlyContributionId, setMonthlyContributionId] = useState<string | null>(null);
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jekoLoading, setJekoLoading] = useState(false);
  const [jekoLinkId, setJekoLinkId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

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

  // Vérification automatique après retour de la page de paiement Jeko
  useEffect(() => {
    const linkId = searchParams.get('jeko_link');
    if (!linkId) return;
    setJekoLinkId(linkId);
    setVerifying(true);
    contributionsApi.jekoVerify(linkId)
      .then((res) => {
        if (res.paid) {
          setPaymentDone(true);
          toast.success('Paiement confirmé ! Votre cotisation a été enregistrée.');
          fetchData();
        } else {
          toast.info('Paiement en attente de confirmation.');
        }
      })
      .catch(() => toast.error('Impossible de vérifier le paiement.'))
      .finally(() => setVerifying(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJekoPay() {
    if (!monthlyContributionId || !monthly || unpaidMonths.length === 0) return;
    setJekoLoading(true);
    setError(null);
    try {
      const firstUnpaid = unpaidMonths[0];
      const amount = Number(monthly.amount);
      const res = await contributionsApi.jekoInit({
        contributionId: monthlyContributionId,
        amount,
        periodYear: firstUnpaid.year,
        periodMonth: firstUnpaid.month,
      });
      setJekoLinkId(res.linkId);
      window.location.href = res.paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'initialisation du paiement.');
    } finally {
      setJekoLoading(false);
    }
  }

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

      {paymentDone ? (
        <div className="card border-l-4 border-l-green-500 bg-green-50/50 flex items-center gap-3">
          <CheckCircle size={24} className="text-green-600 shrink-0" />
          <p className="text-green-800 font-medium">Paiement enregistré avec succès !</p>
        </div>
      ) : (
        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Payer en ligne</h2>
          <p className="text-sm text-gray-500">
            Payez instantanément avec Wave, Orange Money, MTN, Moov ou Djamo.
          </p>
          {verifying ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 size={16} className="animate-spin" />
              Vérification du paiement…
            </div>
          ) : (
            <button
              type="button"
              onClick={handleJekoPay}
              disabled={jekoLoading || !monthlyContributionId || !monthly}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {jekoLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Redirection…</>
              ) : (
                <><CreditCard size={18} /> Payer {monthly?.amount != null ? `${Number(monthly.amount).toLocaleString('fr-FR')} FCFA` : ''} en ligne</>
              )}
            </button>
          )}
          <p className="text-xs text-gray-400">
            Vous serez redirigé vers la page de paiement sécurisée Jeko.
          </p>
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

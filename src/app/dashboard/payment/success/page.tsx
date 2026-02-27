'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { contributionsApi } from '@/lib/api';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get('transaction_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [remainingMonths, setRemainingMonths] = useState<Array<{ year: number; month: number }>>([]);

  useEffect(() => {
    if (!transactionId) {
      setStatus('error');
      setMessage('Paramètre transaction manquant.');
      return;
    }
    let cancelled = false;
    contributionsApi
      .verifyCinetPayTransaction(transactionId)
      .then((res) => {
        if (cancelled) return;
        const remaining = res.remainingUnpaidMonths ?? [];
        setRemainingMonths(remaining);
        const ok = res.status === 'ACCEPTED' && res.completed;
        if (ok) {
          setStatus('success');
          setMessage(
            remaining.length === 0
              ? 'Paiement confirmé. Votre cotisation a été enregistrée. Vous avez accès au tableau de bord.'
              : 'Paiement confirmé pour ce mois.',
          );
        } else if (res.status === 'PENDING') {
          setStatus('pending');
          setMessage('Paiement en cours de confirmation. Vous serez notifié une fois validé.');
        } else {
          setStatus(res.status === 'ACCEPTED' ? 'success' : 'pending');
          setMessage(res.status === 'ACCEPTED' ? 'Paiement accepté.' : 'Vérification en cours.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
        setMessage('Impossible de vérifier le paiement. Réessayez ou contactez le trésorier.');
      });

    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  useEffect(() => {
    if (status !== 'success' && status !== 'error') return;
    if (status === 'success' && remainingMonths.length > 0) return;
    const t = setTimeout(() => {
      router.replace(remainingMonths.length > 0 ? '/dashboard/regulariser' : '/dashboard');
    }, status === 'success' && remainingMonths.length > 0 ? 0 : 4000);
    return () => clearTimeout(t);
  }, [status, router, remainingMonths.length]);

  return (
    <div className="max-w-md mx-auto text-center py-12 px-4">
      {status === 'loading' && (
        <>
          <Loader2 className="mx-auto h-14 w-14 text-[var(--sky-blue)] animate-spin" />
          <h1 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
            Vérification du paiement…
          </h1>
          <p className="mt-2 text-gray-600">Merci de patienter.</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
          <h1 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
            Paiement confirmé
          </h1>
          <p className="mt-2 text-gray-600">{message}</p>
          {remainingMonths.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-left text-sm text-amber-800">
              <p className="font-semibold mb-2">
                Il vous reste à régler pour retrouver l'accès au compte :
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {remainingMonths.map((m) => (
                  <li key={`${m.year}-${m.month}`}>
                    {new Date(m.year, m.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-medium">
                Poursuivez sur « Régulariser » pour payer ces mois.
              </p>
            </div>
          )}
          <p className="mt-4 text-sm text-gray-500">
            {remainingMonths.length > 0 ? 'Redirection vers Régulariser…' : 'Redirection vers le tableau de bord…'}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {remainingMonths.length > 0 && (
              <Link
                href="/dashboard/regulariser"
                className="inline-block btn-primary"
              >
                Payer les mois restants
              </Link>
            )}
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
            >
              Tableau de bord
            </Link>
          </div>
        </>
      )}
      {status === 'pending' && (
        <>
          <Loader2 className="mx-auto h-14 w-14 text-amber-500 animate-spin" />
          <h1 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
            Paiement en cours
          </h1>
          <p className="mt-2 text-gray-600">{message}</p>
          <Link href="/dashboard" className="mt-6 inline-block btn-primary">
            Retour au tableau de bord
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="mx-auto h-14 w-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl">
            !
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
            Vérification impossible
          </h1>
          <p className="mt-2 text-gray-600">{message}</p>
          <Link href="/dashboard" className="mt-6 inline-block btn-primary">
            Retour au tableau de bord
          </Link>
        </>
      )}
    </div>
  );
}

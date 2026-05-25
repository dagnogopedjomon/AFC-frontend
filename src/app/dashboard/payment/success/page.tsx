'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { contributionsApi } from '@/lib/api';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const linkId = searchParams.get('ref');
  const [status, setStatus] = useState<'verifying' | 'paid' | 'pending' | 'error'>('verifying');

  useEffect(() => {
    if (!linkId) {
      setStatus('error');
      return;
    }
    contributionsApi.jekoVerify(linkId)
      .then((res) => {
        if (res.paid) {
          setStatus('paid');
          toast.success('Paiement confirmé !');
          setTimeout(() => router.replace('/dashboard/cotisations'), 2500);
        } else {
          setStatus('pending');
        }
      })
      .catch(() => setStatus('error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card w-full max-w-sm text-center space-y-4 py-10">
        {status === 'verifying' && (
          <>
            <Loader2 size={40} className="animate-spin mx-auto text-[var(--sky-blue)]" />
            <p className="text-gray-600">Vérification du paiement…</p>
          </>
        )}
        {status === 'paid' && (
          <>
            <CheckCircle size={48} className="mx-auto text-green-500" />
            <p className="text-green-700 font-semibold text-lg">Paiement confirmé !</p>
            <p className="text-gray-500 text-sm">Redirection en cours…</p>
          </>
        )}
        {status === 'pending' && (
          <>
            <Loader2 size={40} className="animate-spin mx-auto text-amber-500" />
            <p className="text-amber-700 font-semibold">Paiement en cours de traitement…</p>
            <p className="text-gray-500 text-sm">Revenez dans quelques instants.</p>
            <button onClick={() => router.replace('/dashboard/cotisations')} className="btn-primary w-full">
              Retour aux cotisations
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="mx-auto text-red-500" />
            <p className="text-red-700 font-semibold">Impossible de vérifier le paiement.</p>
            <button onClick={() => router.replace('/dashboard/cotisations')} className="btn-primary w-full">
              Retour aux cotisations
            </button>
          </>
        )}
      </div>
    </div>
  );
}

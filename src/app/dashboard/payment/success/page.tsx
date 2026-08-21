'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { contributionsApi } from '@/lib/api';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const linkId = searchParams.get('ref');
  const [status, setStatus] = useState<'verifying' | 'paid' | 'pending' | 'error'>('verifying');
  const [retryCount, setRetryCount] = useState(0);

  const verifyPayment = async () => {
    if (!linkId) {
      setStatus('error');
      return;
    }
    try {
      const res = await contributionsApi.jekoVerify(linkId);
      if (res.paid) {
        setStatus('paid');
        toast.success('Paiement confirmé !', { duration: 3000 });
        setTimeout(() => router.replace('/dashboard/cotisations'), 3000);
      } else {
        setStatus('pending');
        // Auto-retry every 3 seconds up to 5 times
        if (retryCount < 5) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            verifyPayment();
          }, 3000);
        }
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    verifyPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId]);

  const handleRetry = () => {
    setRetryCount(0);
    setStatus('verifying');
    verifyPayment();
  };

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
            <p className="text-gray-500 text-sm">Votre compte sera réactivé automatiquement.</p>
            <p className="text-gray-400 text-xs">Redirection en cours…</p>
          </>
        )}
        {status === 'pending' && (
          <>
            <Loader2 size={40} className="animate-spin mx-auto text-amber-500" />
            <p className="text-amber-700 font-semibold">Paiement en cours de traitement…</p>
            <p className="text-gray-500 text-sm">
              {retryCount < 5 ? `Vérification automatique (${retryCount + 1}/5)...` : 'Vérification automatique terminée.'}
            </p>
            <button onClick={handleRetry} className="btn-secondary w-full flex items-center justify-center gap-2">
              <RefreshCw size={16} />
              Réessayer la vérification
            </button>
            <button onClick={() => router.replace('/dashboard/cotisations')} className="btn-ghost w-full text-sm">
              Retour aux cotisations
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="mx-auto text-red-500" />
            <p className="text-red-700 font-semibold">Impossible de vérifier le paiement.</p>
            <p className="text-gray-500 text-sm mb-4">
              Si vous avez effectué le paiement, il sera traité automatiquement dans quelques minutes.
            </p>
            <button onClick={handleRetry} className="btn-primary w-full mb-2">
              Réessayer
            </button>
            <button onClick={() => router.replace('/dashboard/cotisations')} className="btn-ghost w-full text-sm">
              Retour aux cotisations
            </button>
          </>
        )}
      </div>
    </div>
  );
}

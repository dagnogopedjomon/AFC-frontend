'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { contributionsApi } from '@/lib/api';

const PAYMENT_METHODS = [
  { id: 'wave',   label: 'Wave' },
  { id: 'orange', label: 'Orange' },
  { id: 'mtn',    label: 'MTN' },
  { id: 'moov',   label: 'Moov' },
  { id: 'djamo',  label: 'Djamo' },
] as const;

type Props = {
  contributionId: string;
  amount: number;
  periodYear?: number;
  periodMonth?: number;
  defaultPhone?: string;
  label?: string;
  onError?: (msg: string) => void;
};

export function JekoPayButton({ contributionId, amount, periodYear, periodMonth, defaultPhone = '', label, onError }: Props) {
  const [method, setMethod] = useState<string>('wave');
  const [phone, setPhone] = useState(defaultPhone);
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (!method) return;
    setLoading(true);
    try {
      const res = await contributionsApi.jekoInit({
        contributionId,
        amount,
        periodYear,
        periodMonth,
        paymentMethod: method,
        payerPhone: phone || undefined,
      });
      window.location.href = res.redirectUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur lors du paiement.';
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  const amountLabel = label ?? `${amount.toLocaleString('fr-FR')} FCFA`;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Méthode de paiement</p>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                method === m.id
                  ? 'bg-[var(--sky-blue)] text-white border-[var(--sky-blue)]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[var(--sky-blue)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Numéro de téléphone</p>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+2250700000000"
          className="input-field w-full"
        />
        <p className="text-xs text-gray-400 mt-1">Format international ex: +2250701234567</p>
      </div>

      <button
        type="button"
        onClick={handlePay}
        disabled={loading || !method || !phone}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> Redirection…</>
        ) : (
          <><CreditCard size={18} /> Payer {amountLabel} en ligne</>
        )}
      </button>
      <p className="text-xs text-gray-400 text-center">Wave · Orange Money · MTN · Moov · Djamo</p>
    </div>
  );
}

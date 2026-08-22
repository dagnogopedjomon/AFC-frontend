'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, type Contribution } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { JekoPayButton } from '@/components/JekoPayButton';

export default function CotisationMensuellePage() {
  const { user } = useAuth();
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(1);
  const [prepayment, setPrepayment] = useState<{ paidThrough: { year: number; month: number } | null; futureMonthsPaid: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([contributionsApi.monthly(), contributionsApi.mePrepayment().catch(() => null)])
      .then(([contribution, status]) => { setMonthly(contribution); setPrepayment(status); })
      .catch(() => setMonthly(null))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--sky-blue)]" />
      </div>
    );
  }

  if (!monthly) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/dashboard/cotisations" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Cotisations</Link>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mt-2">Cotisation mensuelle</h1>
        </div>
        <div className="card text-center py-12">
          <p className="text-gray-500">Aucune cotisation mensuelle définie pour l'instant.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/cotisations" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Cotisations</Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mt-2">Cotisation mensuelle</h1>
        <p className="text-gray-600 mt-1">Échéance le 10 de chaque mois.</p>
      </div>

      <div className="card border-l-4 border-l-[var(--sky-blue)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{monthly.name}</h2>
        <p className="text-3xl font-bold text-[var(--sky-blue)] mt-2">
          {monthly.amount ? Number(monthly.amount).toLocaleString('fr-FR') : '0'} FCFA
          <span className="text-sm font-normal text-gray-500">/mois</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Période en cours : {new Date(currentYear, currentMonth - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
        {prepayment?.paidThrough && (
          <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            Payé jusqu’en {new Date(prepayment.paidThrough.year, prepayment.paidThrough.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Payer ma cotisation</h2>
        <p className="mb-3 text-sm text-gray-600">Choisissez la durée à payer en avance.</p>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 3, 6, 12].map((months) => (
            <button key={months} type="button" onClick={() => setDuration(months)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${duration === months ? 'border-[var(--sky-blue)] bg-[var(--sky-blue-soft)] text-[var(--sky-blue-dark)]' : 'border-gray-200 text-gray-600'}`}>
              {months === 12 ? '1 an' : `${months} mois`}
            </button>
          ))}
        </div>
        <JekoPayButton
          contributionId={monthly.id}
          amount={monthly.amount ? Number(monthly.amount) * duration : 0}
          periodYear={currentYear}
          periodMonth={currentMonth}
          advanceMonths={duration}
          defaultPhone={user?.phone ?? ''}
          label={monthly.amount ? `${(Number(monthly.amount) * duration).toLocaleString('fr-FR')} FCFA (${duration === 12 ? '1 an' : `${duration} mois`})` : undefined}
          onError={(msg) => toast.error(msg)}
        />
      </div>
    </div>
  );
}

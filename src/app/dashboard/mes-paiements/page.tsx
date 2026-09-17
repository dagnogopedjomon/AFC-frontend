'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, type Payment } from '@/lib/api';

const typeLabel: Record<string, string> = { MONTHLY: 'Mensuelle', EXCEPTIONAL: 'Exceptionnelle' };

export default function MesPaiementsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MONTHLY' | 'EXCEPTIONAL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    contributionsApi
      .payments({ memberId: user.id, limit: 500 })
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (typeFilter !== 'ALL' && p.contribution?.type !== typeFilter) return false;
      const paidDay = p.paidAt.slice(0, 10);
      if (startDate && paidDay < startDate) return false;
      if (endDate && paidDay > endDate) return false;
      return true;
    });
  }, [payments, typeFilter, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Mes paiements</h1>
        <p className="text-gray-600 mt-1">Historique de vos paiements de cotisations.</p>
      </div>

      <div className="card">
        <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {([['ALL', 'Tous'], ['MONTHLY', 'Mensuelles'], ['EXCEPTIONAL', 'Exceptionnelles']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`rounded-md px-4 py-2 font-medium ${typeFilter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input type="date" className="input-field" aria-label="Date de début" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="input-field" aria-label="Date de fin" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium" onClick={() => { setStartDate(''); setEndDate(''); setTypeFilter('ALL'); }}>
            Réinitialiser
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[var(--sky-blue-soft)]">
                  <th className="px-4 py-3 text-[var(--sky-blue-dark)]">Date</th>
                  <th className="px-4 py-3 text-gray-600">Type</th>
                  <th className="px-4 py-3 text-gray-600">Objet</th>
                  <th className="px-4 py-3 text-right text-gray-600">Montant</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      Aucun paiement enregistré.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className={`border-b border-gray-50 ${p.cancelledAt ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(p.paidAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{typeLabel[p.contribution?.type ?? ''] ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{p.contribution?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {Number(p.amount).toLocaleString('fr-FR')} FCFA
                        {p.cancelledAt && <span className="ml-2 text-xs font-semibold text-red-600">Annulé</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

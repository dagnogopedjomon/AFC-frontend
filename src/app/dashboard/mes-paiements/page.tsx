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
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Mes paiements</h1>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Historique de vos paiements de cotisations.</p>
      </header>

      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-lg bg-[rgba(var(--afc-hl),0.04)] p-1 text-sm">
          {([['ALL', 'Tous'], ['MONTHLY', 'Mensuelles'], ['EXCEPTIONAL', 'Exceptionnelles']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`rounded-md px-4 py-2 font-medium transition ${typeFilter === value ? 'bg-[#C9A048] text-[#171308]' : 'text-[var(--afc-muted-2)] hover:text-[var(--afc-text)]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input type="date" className="afc-login-input text-sm" aria-label="Date de début" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="afc-login-input text-sm" aria-label="Date de fin" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button type="button" className="rounded-lg border border-[rgba(var(--afc-hl),0.1)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]" onClick={() => { setStartDate(''); setEndDate(''); setTypeFilter('ALL'); }}>
            Réinitialiser
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--afc-border)]">
            <table className="afc-table-dark w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Type</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Objet</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[var(--afc-muted)]">
                      Aucun paiement enregistré.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className={`border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)] ${p.cancelledAt ? 'opacity-50' : ''}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--afc-muted-2)]">
                        {new Date(p.paidAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-[var(--afc-muted-2)]">{typeLabel[p.contribution?.type ?? ''] ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-[var(--afc-text)]">{p.contribution?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--afc-text)]">
                        {Number(p.amount).toLocaleString('fr-FR')} FCFA
                        {p.cancelledAt && <span className="ml-2 text-xs font-semibold text-red-400">Annulé</span>}
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

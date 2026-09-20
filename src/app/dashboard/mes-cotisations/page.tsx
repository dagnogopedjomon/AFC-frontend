'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { contributionsApi, type Contribution, type MemberHistory } from '@/lib/api';

type Debt = Awaited<ReturnType<typeof contributionsApi.meDebtSummary>>;

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} F`;
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function MesCotisationsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [history, setHistory] = useState<MemberHistory | null>(null);
  const [debt, setDebt] = useState<Debt | null>(null);
  const [exceptional, setExceptional] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([contributionsApi.me(), contributionsApi.meDebtSummary(), contributionsApi.exceptional()])
      .then(([h, d, e]) => { setHistory(h); setDebt(d); setExceptional(e); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const monthlyAmount = debt?.monthlyAmount ?? 0;

  const paidByMonth = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of history?.byMonth ?? []) {
      if (row.year === year) map.set(row.month, (map.get(row.month) ?? 0) + row.amount);
    }
    return map;
  }, [history, year]);

  const unpaidSet = useMemo(
    () => new Set((debt?.unpaidMonths ?? []).filter((m) => m.year === year).map((m) => m.month)),
    [debt, year],
  );

  const covered = paidByMonth.size;
  const totalDue = monthlyAmount * 12;
  const totalPaid = Array.from(paidByMonth.values()).reduce((sum, v) => sum + v, 0);
  const remaining = Math.max(totalDue - totalPaid, 0);
  const unpaidCount = debt?.unpaidMonths.length ?? 0;

  const contributedTo = (contributionId: string) =>
    (history?.payments ?? [])
      .filter((p) => !p.cancelledAt && p.contributionId === contributionId)
      .reduce((sum, p) => sum + Number(p.amount), 0);

  const exceptionalStatus = (c: Contribution) => {
    const mine = contributedTo(c.id);
    if (mine > 0 && (c.amount == null || mine >= Number(c.amount))) return { label: 'Payée', tone: 'afc-badge-blue' };
    if (mine > 0) return { label: 'Partielle', tone: 'afc-badge-amber' };
    if (c.status !== 'OPEN') return { label: 'Clôturée', tone: 'afc-badge-gray' };
    return { label: 'À payer', tone: 'afc-badge-amber' };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
      </div>
    );
  }

  const payments = (history?.payments ?? []).filter((p) => !p.cancelledAt);

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Mes cotisations</h1>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Mensuelles et exceptionnelles.</p>
      </header>

      <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--afc-text)]">Cotisations mensuelles</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${unpaidCount === 0 ? 'afc-badge-blue' : 'afc-badge-amber'}`}>
              {unpaidCount === 0 ? 'À jour' : `${unpaidCount} mois impayé${unpaidCount > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Année précédente" onClick={() => setYear((y) => y - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--afc-border)] text-[var(--afc-muted-2)] transition hover:bg-[rgba(var(--afc-hl),0.05)]">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-12 text-center text-sm font-medium text-[var(--afc-text)]">{year}</span>
            <button type="button" aria-label="Année suivante" onClick={() => setYear((y) => y + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--afc-border)] text-[var(--afc-muted-2)] transition hover:bg-[rgba(var(--afc-hl),0.05)]">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {MONTHS.map((label, index) => {
            const month = index + 1;
            const paid = paidByMonth.has(month);
            const late = !paid && unpaidSet.has(month);
            const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
            return (
              <div key={label} className="text-center">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">{label}</p>
                <div
                  title={paid ? `${label} ${year} : payé` : late ? `${label} ${year} : impayé` : `${label} ${year}`}
                  className={`flex h-10 items-center justify-center rounded-lg border text-sm ${
                    paid
                      ? 'afc-badge-blue'
                      : late
                        ? 'afc-badge-red'
                        : `border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] text-[var(--afc-muted)] ${isCurrent ? 'ring-1 ring-[#C9A048]/50' : ''}`
                  }`}
                >
                  {paid ? <Check size={16} /> : late ? '!' : '·'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--afc-border)] pt-5 lg:grid-cols-4">
          {[
            ['Mois couverts', String(covered)],
            ['Dû sur l’année', fcfa(totalDue)],
            ['Déjà versé', fcfa(totalPaid)],
            ['Reste sur l’année', fcfa(remaining)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--afc-text)]">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--afc-muted)]">
          Le total dû couvre l&rsquo;année entière, mois à venir compris. Seule la mention « À jour » en haut de cette carte indique s&rsquo;il vous reste un mois impayé.
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <h2 className="p-5 pb-4 text-lg font-semibold text-[var(--afc-text)]">Cotisations exceptionnelles</h2>
        {exceptional.length === 0 ? (
          <p className="border-t border-[var(--afc-border)] p-8 text-center text-sm text-[var(--afc-muted)]">Aucune cotisation exceptionnelle ne vous concerne.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="afc-table-dark w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr>
                  {['Libellé', 'Échéance', 'Statut', 'Ma contribution'].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)] ${i === 3 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exceptional.map((c) => {
                  const status = exceptionalStatus(c);
                  return (
                    <tr key={c.id} className="border-t border-[rgba(var(--afc-hl),0.04)]">
                      <td className="px-5 py-3 font-medium text-[var(--afc-text)]">{c.name}</td>
                      <td className="px-5 py-3 text-[var(--afc-muted-2)]">{date(c.deadline ?? c.endDate)}</td>
                      <td className="px-5 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.tone}`}>{status.label}</span></td>
                      <td className="px-5 py-3 text-right font-medium text-[var(--afc-text)]">{fcfa(contributedTo(c.id))}{c.amount != null ? <span className="font-normal text-[var(--afc-muted)]"> / {fcfa(Number(c.amount))}</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <summary className="cursor-pointer p-5 text-sm font-semibold text-[var(--afc-text)]">Historique de mes paiements ({payments.length})</summary>
        {payments.length === 0 ? (
          <p className="border-t border-[var(--afc-border)] p-8 text-center text-sm text-[var(--afc-muted)]">Aucun paiement enregistré.</p>
        ) : (
          <div className="overflow-x-auto border-t border-[var(--afc-border)]">
            <table className="afc-table-dark w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr>
                  {['Date', 'Objet', 'Période', 'Montant'].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)] ${i === 3 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-[rgba(var(--afc-hl),0.04)]">
                    <td className="px-5 py-3 text-[var(--afc-muted-2)]">{date(p.paidAt)}</td>
                    <td className="px-5 py-3 text-[var(--afc-text)]">{p.contribution?.name ?? 'Cotisation'}</td>
                    <td className="px-5 py-3 text-[var(--afc-muted-2)]">{p.periodMonth && p.periodYear ? `${MONTHS[p.periodMonth - 1]} ${p.periodYear}` : '—'}</td>
                    <td className="px-5 py-3 text-right font-medium text-[var(--afc-text)]">{fcfa(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
}

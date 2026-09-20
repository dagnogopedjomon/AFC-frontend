'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { caisseApi, type LivreEntry } from '@/lib/api';

const PAGE_SIZE = 15;
const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} F`;

function entryType(entry: LivreEntry): { label: string; tone: string } {
  if (entry.type === 'entree') {
    if (entry.kind === 'fine') return { label: 'Amende', tone: 'afc-badge-red' };
    if (entry.kind === 'allocation') return { label: 'Allocation', tone: 'afc-badge-violet' };
    return /mensuel/i.test(entry.contribution ?? '')
      ? { label: 'Mensuelle', tone: 'afc-badge-blue' }
      : { label: 'Exceptionnelle', tone: 'afc-badge-amber' };
  }
  return entry.kind === 'withdrawal'
    ? { label: 'Retrait', tone: 'afc-badge-gray' }
    : { label: 'Dépense', tone: 'afc-badge-red' };
}

function entryObject(entry: LivreEntry): string {
  if (entry.type === 'entree') {
    if (entry.kind === 'fine') return entry.description ? `Amende — ${entry.description}` : 'Amende';
    if (entry.kind === 'allocation') return entry.description || 'Allocation vers une sous-caisse';
    return entry.contribution ?? 'Cotisation';
  }
  return entry.description || ('label' in entry && entry.label ? String(entry.label) : 'Sortie de caisse');
}

export function CaisseMembre() {
  const [entries, setEntries] = useState<LivreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'entree' | 'sortie'>('entree');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    caisseApi
      .livre(2000)
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  const ofTab = useMemo(() => entries.filter((e) => e.type === tab), [entries, tab]);
  const types = useMemo(() => Array.from(new Set(ofTab.map((e) => entryType(e).label))), [ofTab]);

  const filtered = useMemo(
    () =>
      ofTab.filter((e) => {
        const day = e.date.slice(0, 10);
        if (typeFilter !== 'ALL' && entryType(e).label !== typeFilter) return false;
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    [ofTab, typeFilter, from, to],
  );

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const countLabel = tab === 'entree' ? 'entrée' : 'sortie';

  const reset = () => { setTypeFilter('ALL'); setFrom(''); setTo(''); setPage(1); };

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">La caisse du club</h1>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Entrées et sorties de l&rsquo;association.</p>
      </header>

      {error && <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="flex gap-6 border-b border-[var(--afc-border)]">
        {([['sortie', 'Sorties'], ['entree', 'Entrées']] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => { setTab(value); reset(); }}
            className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition ${tab === value ? 'border-[#C9A048] text-[#C9A048]' : 'border-transparent text-[var(--afc-muted)] hover:text-[var(--afc-text)]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--afc-muted)]">Type</span>
          <select className="afc-login-input !w-44 text-sm" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="ALL">Toutes</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--afc-muted)]">Du</span>
          <input type="date" className="afc-login-input text-sm" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--afc-muted)]">Au</span>
          <input type="date" className="afc-login-input text-sm" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </label>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-sm text-[var(--afc-muted)]">Total de la période</p>
        <p className="text-xl font-semibold text-[var(--afc-text)]">{fcfa(total)}</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
          </div>
        ) : visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-[var(--afc-muted)]">Aucune {countLabel} sur cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="afc-table-dark w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Type</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Objet</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => {
                  const kind = entryType(entry);
                  return (
                    <tr key={`${entry.type}-${entry.id}`} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                      <td className="whitespace-nowrap px-5 py-3 text-[var(--afc-muted-2)]">
                        {new Date(entry.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${kind.tone}`}>{kind.label}</span>
                      </td>
                      <td className="px-5 py-3 text-[var(--afc-text)]">{entryObject(entry)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-[var(--afc-text)]">{fcfa(Number(entry.amount))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--afc-muted)]">
        <span>{filtered.length} {countLabel}{filtered.length > 1 ? 's' : ''}</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="flex items-center gap-1 rounded-lg border border-[var(--afc-border)] px-3 py-1.5 transition hover:bg-[rgba(var(--afc-hl),0.05)] disabled:opacity-40">
            <ChevronLeft size={14} /> Précédent
          </button>
          <span>Page {current} / {pages}</span>
          <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="flex items-center gap-1 rounded-lg border border-[var(--afc-border)] px-3 py-1.5 transition hover:bg-[rgba(var(--afc-hl),0.05)] disabled:opacity-40">
            Suivant <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

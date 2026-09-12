'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, type Contribution, type AnnualContributionMatrix } from '@/lib/api';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { JekoPayButton } from '@/components/JekoPayButton';

export default function CotisationMensuellePage() {
  const { user } = useAuth();
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(1);
  const [prepayment, setPrepayment] = useState<{ paidThrough: { year: number; month: number } | null; futureMonthsPaid: number } | null>(null);
  const [matrixYear, setMatrixYear] = useState(new Date().getFullYear());
  const [matrix, setMatrix] = useState<AnnualContributionMatrix | null>(null);
  const [matrixFilter, setMatrixFilter] = useState<'ALL' | 'CURRENT' | 'LATE'>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([contributionsApi.monthly(), contributionsApi.mePrepayment().catch(() => null)])
      .then(([contribution, status]) => { setMonthly(contribution); setPrepayment(status); })
      .catch(() => setMonthly(null))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    contributionsApi.annualMatrix(matrixYear).then(setMatrix).catch(() => setMatrix(null));
  }, [user, matrixYear]);

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

  if (user?.role === 'ADMIN') {
    const statusLabel = {
      PAID: 'Payé', PARTIAL: 'Partiel', LATE: 'En retard', ADVANCE: 'Avance',
      INACTIVE: 'Inactif', NOT_DUE: 'Non échu', EXEMPT: 'Exonéré',
    } as const;
    const statusClass = {
      PAID: 'bg-emerald-100 text-emerald-800', PARTIAL: 'bg-amber-100 text-amber-800',
      LATE: 'bg-red-100 text-red-700', ADVANCE: 'bg-blue-100 text-blue-800',
      INACTIVE: 'bg-slate-100 text-slate-500', NOT_DUE: 'bg-white text-slate-400 border border-slate-200', EXEMPT: 'bg-violet-100 text-violet-800',
    } as const;
    const statusSymbol = { PAID: '✓', PARTIAL: '%', LATE: '×', ADVANCE: '✓', INACTIVE: '—', NOT_DUE: '·', EXEMPT: '✓' } as const;
    const normalized = query.trim().toLowerCase();
    const visible = (matrix?.members ?? []).filter((member) => {
      const matches = !normalized || `${member.firstName} ${member.lastName} ${member.phone}`.toLowerCase().includes(normalized);
      const current = member.months[currentMonth - 1];
      return matches && (matrixFilter === 'ALL' || (matrixFilter === 'CURRENT' ? ['PAID', 'ADVANCE'].includes(current?.status) : current?.status === 'LATE'));
    });
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><h1 className="text-2xl font-semibold text-slate-900">Cotisations mensuelles</h1><p className="mt-1 text-sm text-slate-500">Suivi mois par mois.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/cotisations/paiement" className="afc-button-primary">+ Nouveau paiement</Link>
            <button className="rounded-lg border border-slate-200 bg-white p-2" onClick={() => setMatrixYear((y) => y - 1)} aria-label="Année précédente"><ChevronLeft size={18}/></button>
            <span className="min-w-20 text-center font-semibold">{matrixYear}</span>
            <button className="rounded-lg border border-slate-200 bg-white p-2" onClick={() => setMatrixYear((y) => y + 1)} aria-label="Année suivante"><ChevronRight size={18}/></button>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="input-field w-full !pl-11" placeholder="Rechercher un membre…" value={query} onChange={(e) => setQuery(e.target.value)}/></div>
            <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
              {([['ALL','Tous'],['CURRENT','À jour'],['LATE','En retard']] as const).map(([value,label]) => <button key={value} onClick={() => setMatrixFilter(value)} className={`rounded-md px-4 py-2 font-medium ${matrixFilter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">{Object.entries(statusLabel).map(([key,label]) => <span key={key} className="inline-flex items-center gap-2 text-slate-500"><span className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-semibold ${statusClass[key as keyof typeof statusClass]}`}>{statusSymbol[key as keyof typeof statusSymbol]}</span>{label}</span>)}</div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500"><strong className="text-slate-800">{visible.reduce((sum, member) => sum + member.months.reduce((s, cell) => s + cell.amountPaid, 0), 0).toLocaleString('fr-FR')} F</strong> encaissés sur {matrixYear} <span className="mx-2">·</span> {visible.length} membre{visible.length === 1 ? '' : 's'} affiché{visible.length === 1 ? '' : 's'}</div>
        </div>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead><tr className="bg-sky-50 text-left text-slate-600"><th className="sticky left-0 z-10 bg-sky-50 px-5 py-4">Membre</th>{Array.from({length:12},(_,i)=><th key={i} className="px-3 py-4 text-center">{new Date(2020,i).toLocaleString('fr-FR',{month:'short'})}</th>)}<th className="px-4 py-4 text-right">Total</th></tr></thead>
              <tbody>{visible.map((member) => <tr key={member.id} className="border-t border-slate-100 hover:bg-slate-50/70"><td className="sticky left-0 z-10 bg-white px-5 py-4"><p className="font-mono font-semibold text-slate-900">{member.firstName} {member.lastName}</p><p className="font-mono text-xs text-slate-500">{member.phone}</p></td>{member.months.map((cell)=><td key={cell.month} className="px-2 py-3 text-center"><span title={`${statusLabel[cell.status]}${cell.amountPaid ? ` · ${cell.amountPaid.toLocaleString('fr-FR')} FCFA` : ''}`} className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold ${statusClass[cell.status]}`}>{statusSymbol[cell.status]}</span></td>)}<td className="font-mono px-4 py-4 text-right font-semibold">{member.months.reduce((sum,m)=>sum+m.amountPaid,0).toLocaleString('fr-FR')} F</td></tr>)}</tbody>
            </table>
          </div>
          {!matrix && <div className="p-10 text-center text-slate-500">Chargement du suivi annuel…</div>}
          {matrix && visible.length === 0 && <div className="p-10 text-center text-slate-500">Aucun membre ne correspond aux filtres.</div>}
        </div>
      </div>
    );
  }

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

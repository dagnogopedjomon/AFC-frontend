'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, notificationsApi, reportsApi, type Contribution, type AnnualContributionMatrix } from '@/lib/api';
import { toast } from 'sonner';
import { Bell, ChevronLeft, ChevronRight, ClipboardList, Copy, Download, Loader2, Plus, Search, X } from 'lucide-react';
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
  const [showRecap, setShowRecap] = useState(false);
  const [recapText, setRecapText] = useState('');
  const [showRelances, setShowRelances] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<string[]>([]);

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
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A048]" />
      </div>
    );
  }

  if (!monthly) {
    return (
      <div className="space-y-5">
        <div>
          <Link href="/dashboard/cotisations" className="font-medium text-[#C9A048] hover:underline">← Cotisations</Link>
          <h1 className="mt-2 text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Cotisation mensuelle</h1>
        </div>
        <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12 text-center">
          <p className="text-[var(--afc-muted)]">Aucune cotisation mensuelle définie pour l&apos;instant.</p>
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
      PAID: 'afc-badge-emerald border',
      PARTIAL: 'afc-badge-amber border',
      LATE: 'afc-badge-red border',
      ADVANCE: 'afc-badge-blue border',
      INACTIVE: 'bg-[rgba(var(--afc-hl),0.06)] text-[var(--afc-muted)] border border-[rgba(var(--afc-hl),0.08)]',
      NOT_DUE: 'bg-transparent text-[var(--afc-muted-3)] border border-[rgba(var(--afc-hl),0.08)]',
      EXEMPT: 'afc-badge-violet border',
    } as const;
    const statusSymbol = { PAID: '✓', PARTIAL: '%', LATE: '×', ADVANCE: '✓', INACTIVE: '—', NOT_DUE: '·', EXEMPT: '✓' } as const;
    const normalized = query.trim().toLowerCase();
    const visible = (matrix?.members ?? []).filter((member) => {
      const matches = !normalized || `${member.firstName} ${member.lastName} ${member.phone}`.toLowerCase().includes(normalized);
      const current = member.months[currentMonth - 1];
      return matches && (matrixFilter === 'ALL' || (matrixFilter === 'CURRENT' ? ['PAID', 'ADVANCE'].includes(current?.status) : current?.status === 'LATE'));
    });
    const totalCollected = visible.reduce((sum, member) => sum + member.months.reduce((s, cell) => s + cell.amountPaid, 0), 0);
    const paidInstallments = visible.reduce((sum, member) => sum + member.months.filter((cell) => cell.status === 'PAID' || cell.status === 'ADVANCE').length, 0);
    const lateMembers = visible.filter((member) => member.months[currentMonth - 1]?.status === 'LATE').length;
    const lateMembersList = visible.filter((member) => member.months[currentMonth - 1]?.status === 'LATE');
    const openRelances = () => {
      setSelectedReminderIds(lateMembersList.map((member) => member.id));
      setShowRelances(true);
    };
    const sendReminders = async () => {
      if (selectedReminderIds.length === 0) return;
      try {
        const periodLabel = new Date(currentYear, currentMonth - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        await Promise.all(selectedReminderIds.map((memberId) => notificationsApi.remindCotisation(memberId, periodLabel)));
        toast.success(`${selectedReminderIds.length} relance(s) envoyée(s).`);
        setShowRelances(false);
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Envoi des relances impossible'); }
    };
    const openRecap = () => {
      const monthLabel = new Date(currentYear, currentMonth - 1).toLocaleString('fr-FR', { month: 'long' });
      const lines = visible.map((member) => {
        const current = member.months[currentMonth - 1];
        return `${member.firstName} ${member.lastName}  ${Number(current?.amountPaid ?? 0).toLocaleString('fr-FR')} F`;
      });
      setRecapText(`${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} ${currentYear} — récapitulatif\n\n${paidInstallments} mensualités encaissées\nTotal encaissé : ${totalCollected.toLocaleString('fr-FR')} F\nMensualités en retard : ${lateMembers}\n\n${lines.join('\n')}`);
      setShowRecap(true);
    };
    return (
      <div className="space-y-5">
        <header className="pt-1">
          <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Cotisation mensuelle</h1>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Suivi annuel des mensualités par membre.</p>
        </header>

        <div className="space-y-4 rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] p-2 text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]" onClick={() => setMatrixYear((y) => y - 1)} aria-label="Année précédente"><ChevronLeft size={18} strokeWidth={1.8}/></button>
              <span className="min-w-20 text-center text-lg font-semibold text-[var(--afc-text)]">{matrixYear}</span>
              <button className="rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] p-2 text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]" onClick={() => setMatrixYear((y) => y + 1)} aria-label="Année suivante"><ChevronRight size={18} strokeWidth={1.8}/></button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={openRecap} className="inline-flex items-center gap-2 rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:border-[#C9A048]/40 hover:text-[#C9A048]"><ClipboardList size={16} strokeWidth={1.8}/> Récap</button>
              <button type="button" onClick={openRelances} className="inline-flex items-center gap-2 rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:border-[#C9A048]/40 hover:text-[#C9A048]"><Bell size={16} strokeWidth={1.8}/> Relances</button>
              <button type="button" onClick={() => reportsApi.downloadExcel(matrixYear)} className="inline-flex items-center gap-2 rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:border-[#C9A048]/40 hover:text-[#C9A048]"><Download size={16} strokeWidth={1.8}/> Exporter</button>
              <Link href="/dashboard/cotisations/paiement" className="afc-button-primary"><Plus size={15} strokeWidth={2} aria-hidden="true" /> Enregistrer un paiement</Link>
            </div>
          </div>
          <div className="border-t border-[var(--afc-border)] pt-3 text-sm text-[var(--afc-muted)]">
            <strong className="text-[var(--afc-text)]">{paidInstallments} mensualités encaissées en {matrixYear}</strong>
            <span className="mx-2">·</span>
            <strong className="text-[#C9A048]">{totalCollected.toLocaleString('fr-FR')} F</strong> total
            <span className="mx-2">·</span>
            <strong className="text-[var(--afc-text)]">{lateMembers}</strong> mensualité{lateMembers === 1 ? '' : 's'} en retard
          </div>
        </div>

        {showRecap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="recap-title">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[rgba(var(--afc-hl),0.08)] bg-[var(--afc-card)] shadow-2xl">
              <div className="flex items-start justify-between px-6 py-5 sm:px-8">
                <div>
                  <h2 id="recap-title" className="text-3xl font-light text-[var(--afc-text)]">Récap du mois</h2>
                  <p className="mt-2 text-sm text-[var(--afc-muted)]">Texte prêt à copier-coller. Modifiable avant envoi.</p>
                </div>
                <button type="button" onClick={() => setShowRecap(false)} aria-label="Fermer" className="rounded-lg p-2 text-[var(--afc-muted)] transition hover:bg-[rgba(var(--afc-hl),0.06)] hover:text-[var(--afc-text)]"><X size={22}/></button>
              </div>
              <div className="px-6 pb-6 sm:px-8">
                <textarea value={recapText} onChange={(e) => setRecapText(e.target.value)} className="afc-login-input min-h-[340px] w-full resize-y font-mono text-sm leading-7" />
              </div>
              <div className="flex justify-end gap-3 border-t border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] px-6 py-4 sm:px-8">
                <button type="button" onClick={() => setShowRecap(false)} className="rounded-xl border border-[rgba(var(--afc-hl),0.1)] bg-[rgba(var(--afc-hl),0.03)] px-5 py-2.5 text-sm font-semibold text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]">Fermer</button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(recapText); toast.success('Récapitulatif copié.'); }} className="afc-button-primary !rounded-xl"><Copy size={16}/> Copier</button>
              </div>
            </div>
          </div>
        )}

        {showRelances && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="relances-title">
            <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[rgba(var(--afc-hl),0.08)] bg-[var(--afc-card)] shadow-2xl">
              <div className="flex items-start justify-between px-6 py-5">
                <div>
                  <h2 id="relances-title" className="text-3xl font-light text-[var(--afc-text)]">Relances à envoyer</h2>
                  <p className="mt-2 text-sm text-[var(--afc-muted)]">Sélectionne les membres à relancer pour le mois en cours.</p>
                </div>
                <button type="button" onClick={() => setShowRelances(false)} aria-label="Fermer" className="rounded-lg p-2 text-[var(--afc-muted)] transition hover:bg-[rgba(var(--afc-hl),0.06)] hover:text-[var(--afc-text)]"><X size={22}/></button>
              </div>
              <div className="max-h-96 overflow-y-auto border-y border-[var(--afc-border)] px-6 py-3">
                {lateMembersList.length === 0 ? (
                  <p className="py-8 text-center text-[var(--afc-muted)]">Aucun membre en retard.</p>
                ) : lateMembersList.map((member) => (
                  <label key={member.id} className="flex cursor-pointer items-center gap-3 border-b border-[rgba(var(--afc-hl),0.04)] py-3 last:border-0">
                    <input type="checkbox" checked={selectedReminderIds.includes(member.id)} onChange={(event) => setSelectedReminderIds((ids) => event.target.checked ? [...ids, member.id] : ids.filter((id) => id !== member.id))} className="h-4 w-4 accent-[#C9A048]"/>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--afc-avatar-bg)] text-xs font-semibold text-[var(--afc-avatar-text)]">{member.firstName[0]}{member.lastName[0]}</span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm text-[var(--afc-text)]">{member.firstName} {member.lastName}</strong>
                      <span className="block text-xs text-[var(--afc-muted)]">{member.phone}</span>
                    </span>
                    <span className="rounded-full border border-red-700/30 bg-red-900/20 px-2.5 py-1 text-xs font-semibold text-red-400">En retard</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 bg-[rgba(var(--afc-hl),0.02)] px-6 py-4">
                <span className="text-sm text-[var(--afc-muted)]">{selectedReminderIds.length} sélectionné(s)</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowRelances(false)} className="rounded-xl border border-[rgba(var(--afc-hl),0.1)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2.5 text-sm font-semibold text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]">Annuler</button>
                  <button type="button" disabled={selectedReminderIds.length === 0} onClick={sendReminders} className="afc-button-primary !rounded-xl disabled:opacity-50"><Bell size={16}/> Envoyer les relances</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--afc-muted-3)]" size={15} strokeWidth={1.6}/>
              <input className="afc-login-input w-full !py-2 !pl-9 text-sm" placeholder="Rechercher un membre…" value={query} onChange={(e) => setQuery(e.target.value)}/>
            </div>
            <div className="flex rounded-lg bg-[rgba(var(--afc-hl),0.04)] p-1 text-sm">
              {([['ALL','Tous'],['CURRENT','À jour'],['LATE','En retard']] as const).map(([value,label]) => (
                <button key={value} onClick={() => setMatrixFilter(value)} className={`rounded-md px-4 py-2 font-medium transition ${matrixFilter === value ? 'bg-[#C9A048] text-[#171308]' : 'text-[var(--afc-muted-2)] hover:text-[var(--afc-text)]'}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {Object.entries(statusLabel).map(([key,label]) => (
              <span key={key} className="inline-flex items-center gap-2 text-[var(--afc-muted)]">
                <span className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-semibold ${statusClass[key as keyof typeof statusClass]}`}>{statusSymbol[key as keyof typeof statusSymbol]}</span>
                {label}
              </span>
            ))}
          </div>
          <div className="mt-4 border-t border-[var(--afc-border)] pt-3 text-sm text-[var(--afc-muted)]">
            <strong className="text-[var(--afc-text)]">{totalCollected.toLocaleString('fr-FR')} F</strong> encaissés sur {matrixYear} <span className="mx-2">·</span> {visible.length} membre{visible.length === 1 ? '' : 's'} affiché{visible.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
          <div className="overflow-x-auto">
            <table className="afc-table-dark w-full min-w-[1180px] text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-[var(--afc-card)] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Membre</th>
                  {Array.from({length:12},(_,i)=>(
                    <th key={i} className="px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">{new Date(2020,i).toLocaleString('fr-FR',{month:'short'})}</th>
                  ))}
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Total</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => (
                  <tr key={member.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                    <td className="sticky left-0 z-10 bg-[var(--afc-card)] px-5 py-3.5">
                      <p className="font-mono font-semibold text-[var(--afc-text)]">{member.firstName} {member.lastName}</p>
                      <p className="font-mono text-xs text-[var(--afc-muted)]">{member.phone}</p>
                    </td>
                    {member.months.map((cell)=>(
                      <td key={cell.month} className="px-2 py-3 text-center">
                        <span title={`${statusLabel[cell.status]}${cell.amountPaid ? ` · ${cell.amountPaid.toLocaleString('fr-FR')} FCFA` : ''}`} className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold ${statusClass[cell.status]}`}>{statusSymbol[cell.status]}</span>
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-[var(--afc-text)]">{member.months.reduce((sum,m)=>sum+m.amountPaid,0).toLocaleString('fr-FR')} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!matrix && <div className="p-10 text-center text-[var(--afc-muted)]">Chargement du suivi annuel…</div>}
          {matrix && visible.length === 0 && <div className="p-10 text-center text-[var(--afc-muted)]">Aucun membre ne correspond aux filtres.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/dashboard/cotisations" className="font-medium text-[#C9A048] hover:underline">← Cotisations</Link>
        <h1 className="mt-2 text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Cotisation mensuelle</h1>
        <p className="mt-1 text-sm text-[var(--afc-muted)]">Échéance le 10 de chaque mois.</p>
      </div>

      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <h2 className="text-lg font-semibold text-[var(--afc-text)]">{monthly.name}</h2>
        <p className="mt-2 text-3xl font-semibold text-[#C9A048]">
          {monthly.amount ? Number(monthly.amount).toLocaleString('fr-FR') : '0'} FCFA
          <span className="text-sm font-normal text-[var(--afc-muted)]">/mois</span>
        </p>
        <p className="mt-1 text-sm text-[var(--afc-muted)]">
          Période en cours : {new Date(currentYear, currentMonth - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
        {prepayment?.paidThrough && (
          <p className="mt-3 inline-flex rounded-full border border-emerald-700/30 bg-emerald-900/20 px-3 py-1 text-sm font-semibold text-emerald-400">
            Payé jusqu&rsquo;en {new Date(prepayment.paidThrough.year, prepayment.paidThrough.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--afc-muted)]">Payer ma cotisation</h2>
        <p className="mb-3 text-sm text-[var(--afc-muted-2)]">Choisissez la durée à payer en avance.</p>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 3, 6, 12].map((months) => (
            <button key={months} type="button" onClick={() => setDuration(months)} className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${duration === months ? 'border-[#C9A048]/50 bg-[#C9A048]/10 text-[#C9A048]' : 'border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.02)] text-[var(--afc-muted-2)] hover:border-[rgba(var(--afc-hl),0.16)]'}`}>
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

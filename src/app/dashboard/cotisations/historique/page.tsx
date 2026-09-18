'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, membersApi, type HistorySummary, type MemberHistory, type Member, type Payment } from '@/lib/api';

const HISTORY_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];

export default function HistoriquePage() {
  const paymentsPerPage = 10;
  const { user } = useAuth();
  const canView = !!user && HISTORY_ROLES.includes(user.role);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MONTHLY' | 'EXCEPTIONAL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberHistory, setMemberHistory] = useState<MemberHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cancelPayment(payment: Payment) {
    const reason = window.prompt('Motif de l’annulation (obligatoire) :');
    if (!reason?.trim()) return;
    try {
      const updated = await contributionsApi.cancelPayment(payment.id, reason.trim());
      setPayments((rows) => rows.map((row) => row.id === payment.id ? { ...row, ...updated } : row));
      setSummary(await contributionsApi.historySummary());
    } catch (e) { setError(e instanceof Error ? e.message : 'Annulation impossible'); }
  }

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return payments.filter((p) => {
      if (typeFilter !== 'ALL' && p.contribution?.type !== typeFilter) return false;
      const paidDay = p.paidAt.slice(0, 10);
      if (startDate && paidDay < startDate) return false;
      if (endDate && paidDay > endDate) return false;
      if (!q) return true;
      const member = p.member;
      if (!member) return false;
      const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.toLowerCase();
      const phone = (member.phone ?? '').toLowerCase();
      return fullName.includes(q) || phone.includes(q);
    });
  }, [payments, searchQuery, typeFilter, startDate, endDate]);

  const paymentsPageCount = Math.max(1, Math.ceil(filteredPayments.length / paymentsPerPage));
  const currentPaymentsPage = Math.min(paymentsPage, paymentsPageCount);
  const paginatedPayments = useMemo(() => {
    const start = (currentPaymentsPage - 1) * paymentsPerPage;
    return filteredPayments.slice(start, start + paymentsPerPage);
  }, [filteredPayments, currentPaymentsPage]);

  useEffect(() => {
    if (!user || !canView) return;
    setLoading(true);
    contributionsApi
      .historySummary()
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
    membersApi.list().then(setMembers).catch(() => {});
  }, [user, canView]);

  useEffect(() => {
    if (!user || !canView) return;
    setPaymentsLoading(true);
    contributionsApi
      .payments({ limit: 500 })
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false));
  }, [user, canView]);

  useEffect(() => {
    if (!selectedMemberId) {
      setMemberHistory(null);
      return;
    }
    contributionsApi
      .memberHistory(selectedMemberId)
      .then(setMemberHistory)
      .catch(() => setMemberHistory(null));
  }, [selectedMemberId]);

  if (!canView) {
    return (
      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-6">
        <h1 className="mb-2 text-xl font-semibold text-[var(--afc-text)]">Historique</h1>
        <p className="text-sm text-[var(--afc-muted)]">L&rsquo;accès à cette page est réservé à l&rsquo;Admin et au bureau. Consultez vos paiements dans « Mes paiements ».</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Historique</h1>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Tous les paiements enregistrés.</p>
        </div>
        <Link href="/dashboard/cotisations/paiement" className="afc-button-primary shrink-0"><Plus size={15} strokeWidth={2} aria-hidden="true" /> Nouveau paiement</Link>
      </header>

      {/* Recherche des paiements — tracer qui a payé */}
      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Recherche des paiements</h2>
        <p className="mb-4 text-sm text-[var(--afc-muted-2)]">
          Recherchez par nom ou numéro de téléphone pour voir tous les paiements d&rsquo;un membre.
        </p>
        <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-lg bg-[rgba(var(--afc-hl),0.04)] p-1 text-sm">
          {([['ALL','Tous'],['MONTHLY','Mensuelles'],['EXCEPTIONAL','Exceptionnelles']] as const).map(([value,label])=>(
            <button key={value} type="button" onClick={()=>{setTypeFilter(value);setPaymentsPage(1);}} className={`rounded-md px-4 py-2 font-medium transition ${typeFilter===value?'bg-[#C9A048] text-[#171308]':'text-[var(--afc-muted-2)] hover:text-[var(--afc-text)]'}`}>{label}</button>
          ))}
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--afc-muted-3)]" />
            <input
              type="search"
              placeholder="Nom ou téléphone…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPaymentsPage(1);
              }}
              className="afc-login-input w-full !pl-10 text-sm"
            />
          </div>
          <input type="date" className="afc-login-input text-sm" aria-label="Date de début" value={startDate} onChange={e=>setStartDate(e.target.value)}/>
          <input type="date" className="afc-login-input text-sm" aria-label="Date de fin" value={endDate} onChange={e=>setEndDate(e.target.value)}/>
          <button type="button" className="rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]" onClick={()=>{setSearchQuery('');setStartDate('');setEndDate('');setTypeFilter('ALL');}}>Réinitialiser</button>
        </div>
        {paymentsLoading ? (
          <div className="flex justify-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--afc-border)]">
            <table className="afc-table-dark w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Membre</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Téléphone</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Cotisation</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Source / action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[var(--afc-muted)]">
                      {payments.length === 0 ? 'Aucun paiement enregistré.' : 'Aucun résultat pour cette recherche.'}
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((p) => (
                    <tr key={p.id} className={`border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)] ${p.cancelledAt ? 'opacity-50' : ''}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--afc-muted-2)]">
                        {new Date(p.paidAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--afc-text)]">
                        {p.member ? `${p.member.firstName} ${p.member.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--afc-muted-2)]">{p.member?.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--afc-muted-2)]">{p.contribution?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-[var(--afc-text)]">{Number(p.amount).toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="block text-[var(--afc-muted-2)]">{p.metadata?.includes('external_admin') ? 'Hors application' : 'En ligne / interne'}</span>
                        {p.cancelledAt ? <span className="font-semibold text-red-400">Annulé</span> : user?.role === 'ADMIN' ? <button type="button" onClick={() => cancelPayment(p)} className="font-semibold text-red-400 transition hover:text-red-300 hover:underline">Annuler</button> : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {filteredPayments.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--afc-muted)]">
              {filteredPayments.length} paiement{filteredPayments.length !== 1 ? 's' : ''}{searchQuery.trim() ? ' trouvé(s)' : ''}.
            </p>
            {paymentsPageCount > 1 && (
              <nav aria-label="Pagination des paiements" className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentsPage((page) => Math.max(1, page - 1))}
                  disabled={currentPaymentsPage === 1}
                  className="rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] px-3 py-1.5 text-sm font-medium text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Précédent
                </button>
                <span className="min-w-16 text-center text-sm font-semibold text-[var(--afc-text)]">
                  {currentPaymentsPage}/{paymentsPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPaymentsPage((page) => Math.min(paymentsPageCount, page + 1))}
                  disabled={currentPaymentsPage === paymentsPageCount}
                  className="rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] px-3 py-1.5 text-sm font-medium text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Suivant
                </button>
              </nav>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-3 text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
        </div>
      ) : (
        <>
          {summary && (
            <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
              <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Solde global (cotisation mensuelle)</h2>
              <p className="text-2xl font-semibold text-[#C9A048]">
                {summary.totalCollected.toLocaleString('fr-FR')} FCFA
              </p>
              <p className="mt-1 text-sm text-[var(--afc-muted)]">Total collecté (toutes périodes)</p>
              {summary.byMonth.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-medium text-[var(--afc-muted-2)]">Par mois</h3>
                  <div className="overflow-x-auto rounded-lg border border-[var(--afc-border)]">
                    <table className="afc-table-dark w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Période</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Collecté</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Paiements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.byMonth.slice(0, 12).map((m) => (
                          <tr key={`${m.year}-${m.month}`} className="border-t border-[rgba(var(--afc-hl),0.04)]">
                            <td className="px-4 py-2.5 text-[var(--afc-text-soft)]">
                              {new Date(m.year, m.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-[var(--afc-text)]">{m.totalCollected.toLocaleString('fr-FR')} FCFA</td>
                            <td className="px-4 py-2.5 text-[var(--afc-muted-2)]">{m.paymentsCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
            <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Historique par membre</h2>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Choisir un membre</label>
              <select
                className="afc-login-input max-w-md text-sm"
                value={selectedMemberId ?? ''}
                onChange={(e) => setSelectedMemberId(e.target.value || null)}
              >
                <option value="">— Choisir —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} — {m.phone}
                  </option>
                ))}
              </select>
            </div>
            {memberHistory && (
              <div className="mt-4 space-y-4">
                <p className="font-medium text-[var(--afc-text)]">
                  {memberHistory.member.firstName} {memberHistory.member.lastName} — Total payé :{' '}
                  {memberHistory.totalPaid.toLocaleString('fr-FR')} FCFA
                </p>
                {memberHistory.byMonth.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-[var(--afc-border)]">
                    <table className="afc-table-dark w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Période</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date paiement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberHistory.byMonth.map((m, i) => (
                          <tr key={i} className="border-t border-[rgba(var(--afc-hl),0.04)]">
                            <td className="px-4 py-2.5 text-[var(--afc-text-soft)]">
                              {new Date(m.year, m.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-2.5 text-[var(--afc-text)]">{m.amount.toLocaleString('fr-FR')} FCFA</td>
                            <td className="px-4 py-2.5 text-[var(--afc-muted-2)]">
                              {new Date(m.paidAt).toLocaleDateString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {memberHistory.byMonth.length === 0 && (
                  <p className="text-[var(--afc-muted)]">Aucun paiement de cotisation mensuelle pour ce membre.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

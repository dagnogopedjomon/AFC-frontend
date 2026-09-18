'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { caisseApi, type Expense } from '@/lib/api';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

const CAISSE_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];
const CAN_CREATE = ['ADMIN', 'TREASURER'];

function statusLabel(status: string) {
  switch (status) {
    case 'PENDING_TREASURER':
      return { text: 'En attente trésorier', color: 'afc-badge-amber border' };
    case 'PENDING_COMMISSIONER':
      return { text: 'En attente commissaire', color: 'afc-badge-blue border' };
    case 'APPROVED':
      return { text: 'Approuvée', color: 'afc-badge-emerald border' };
    case 'REJECTED':
      return { text: 'Rejetée', color: 'afc-badge-red border' };
    default:
      return { text: status, color: 'afc-badge-gray border' };
  }
}

export default function DepensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [expenseDetail, setExpenseDetail] = useState<Expense | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const canAct = user && CAISSE_ROLES.includes(user.role);
  const canCreate = user && CAN_CREATE.includes(user.role);
  const isAdmin = user?.role === 'ADMIN';
  const isTreasurer = user?.role === 'TREASURER';
  const isCommissioner = user?.role === 'COMMISSIONER';
  const visibleExpenses = expenses.filter((expense) => {
    const q = query.trim().toLowerCase();
    const matchesText = !q || `${expense.description} ${expense.beneficiary ?? ''} ${expense.requestedBy.firstName} ${expense.requestedBy.lastName}`.toLowerCase().includes(q);
    return matchesText && (statusFilter === 'ALL' || expense.status === statusFilter);
  });

  const load = () => {
    if (!user) return;
    setLoading(true);
    caisseApi.expenses(undefined, limit)
      .then(setExpenses)
      .catch(() => setExpenses([]))
      .finally(() => {
        setLoading(false);
        window.dispatchEvent(new Event('caisse-expenses-updated'));
      });
  };

  useEffect(() => { load(); }, [user, limit]);

  const handleValidateTreasurer = (id: string) => {
    setActioning(id);
    caisseApi.validateTreasurer(id)
      .then(() => { toast.success('Dépense validée.'); load(); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setActioning(null));
  };

  const handleValidateCommissioner = (id: string) => {
    setActioning(id);
    caisseApi.validateCommissioner(id)
      .then(() => { toast.success('Dépense approuvée.'); load(); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setActioning(null));
  };

  const handleReject = (id: string) => {
    const reason = prompt('Motif du rejet :');
    if (!reason) return;
    setActioning(id);
    caisseApi.rejectExpense(id, reason)
      .then(() => { toast.success('Dépense rejetée.'); load(); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setActioning(null));
  };

  if (!canAct) {
    return (
      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12 text-center text-[var(--afc-muted)]">
        Accès réservé au bureau.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Dépenses</h1>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Sorties de caisse</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center justify-end gap-3">
          {canCreate && (
            <Link href="/dashboard/caisse/nouvelle-depense" className="afc-button-primary w-full sm:w-auto">
              <Plus size={15} strokeWidth={2} aria-hidden="true" /> Ajouter une dépense
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-20 text-center text-sm text-[var(--afc-muted)]">Chargement des dépenses…</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
          <div className="flex flex-col gap-3 border-b border-[var(--afc-border)] p-4 sm:flex-row sm:items-center">
            <div className="relative w-full min-w-0 sm:flex-[2]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--afc-muted-3)]" size={15} strokeWidth={1.6}/>
              <input className="afc-login-input block w-full !py-2 !pl-9 text-sm" placeholder="Libellé, bénéficiaire ou demandeur…" value={query} onChange={(e)=>setQuery(e.target.value)}/>
            </div>
            <select className="afc-login-input !w-full shrink-0 !py-2 text-sm sm:!w-44" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING_TREASURER">En attente trésorier</option>
              <option value="PENDING_COMMISSIONER">En attente commissaire</option>
              <option value="APPROVED">Approuvées</option>
              <option value="REJECTED">Rejetées</option>
            </select>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {visibleExpenses.map((e) => {
              const status = statusLabel(e.status);
              return (
                <article key={e.id} className="rounded-xl border border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--afc-muted)]">{new Date(e.expenseDate).toLocaleDateString('fr-FR')} · {e.cashBox?.name ?? 'Caisse par défaut'}</p>
                      <button type="button" onClick={() => setExpenseDetail(e)} className="mt-1 block max-w-full truncate text-left font-semibold text-[var(--afc-text)]">{e.description}</button>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>{status.text}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--afc-border)] pt-3">
                    <span className="font-semibold text-[var(--afc-text)]">{Number(e.amount).toLocaleString('fr-FR')} FCFA</span>
                    <span className="truncate text-right text-xs text-[var(--afc-muted)]">{e.requestedBy.firstName} {e.requestedBy.lastName}</span>
                  </div>
                  {e.status === 'REJECTED' && e.rejectReason && <p className="mt-2 text-xs text-red-400">Motif : {e.rejectReason}</p>}
                  {canAct && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {e.status === 'PENDING_TREASURER' && (isTreasurer || isAdmin) && <>
                        <button type="button" onClick={() => handleValidateTreasurer(e.id)} disabled={actioning === e.id} className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-400 disabled:opacity-60">Valider</button>
                        <button type="button" onClick={() => handleReject(e.id)} disabled={actioning === e.id} className="rounded-lg border border-red-700/30 bg-red-900/20 px-3 py-2 text-xs font-semibold text-red-400 disabled:opacity-60">Rejeter</button>
                      </>}
                      {e.status === 'PENDING_COMMISSIONER' && (isCommissioner || isAdmin) && <>
                        <button type="button" onClick={() => handleValidateCommissioner(e.id)} disabled={actioning === e.id} className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-400 disabled:opacity-60">Valider</button>
                        <button type="button" onClick={() => handleReject(e.id)} disabled={actioning === e.id} className="rounded-lg border border-red-700/30 bg-red-900/20 px-3 py-2 text-xs font-semibold text-red-400 disabled:opacity-60">Rejeter</button>
                      </>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="afc-table-dark w-full table-fixed text-left">
              <thead>
                <tr>
                  <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Sous-caisse</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Description</th>
                  <th className="hidden px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)] xl:table-cell">Catégorie</th>
                  <th className="hidden px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)] 2xl:table-cell">Bénéficiaire</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
                  <th className="hidden px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)] 2xl:table-cell">Demandé par</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Statut</th>
                  <th className="hidden px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)] 2xl:table-cell">Motif rejet</th>
                  {canAct && <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visibleExpenses.map((e) => {
                  const status = statusLabel(e.status);
                  return (
                    <tr key={e.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                      <td className="whitespace-nowrap px-6 py-3.5 text-sm text-[var(--afc-muted-2)]">
                        {new Date(e.expenseDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-[var(--afc-muted-2)]">
                        {e.cashBox?.name ?? 'Caisse par défaut'}
                      </td>
                      <td className="max-w-0 px-4 py-3.5 font-medium text-[var(--afc-text)]">
                        <button
                          type="button"
                          onClick={() => setExpenseDetail(e)}
                          className="block max-w-full truncate text-left transition hover:text-[#C9A048] hover:underline"
                          title="Cliquer pour voir la description complète"
                        >
                          {e.description}
                        </button>
                      </td>
                      <td className="hidden px-6 py-3.5 text-sm text-[var(--afc-muted-2)] xl:table-cell">{e.category?.name ?? '—'}</td>
                      <td className="hidden px-6 py-3.5 text-sm text-[var(--afc-muted-2)] 2xl:table-cell">{e.beneficiary ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[var(--afc-text)]">
                        {Number(e.amount).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="hidden px-6 py-3.5 text-sm text-[var(--afc-muted-2)] 2xl:table-cell">
                        {e.requestedBy.firstName} {e.requestedBy.lastName}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="hidden max-w-[200px] truncate px-6 py-3.5 text-sm text-[var(--afc-muted-2)] 2xl:table-cell" title={e.rejectReason ?? undefined}>
                        {e.status === 'REJECTED' && e.rejectReason ? e.rejectReason : '—'}
                      </td>
                      {canAct && (
                        <td className="px-6 py-3.5">
                          {e.status === 'PENDING_TREASURER' && (isTreasurer || isAdmin) && (
                            <div className="flex gap-3">
                              <button type="button" onClick={() => handleValidateTreasurer(e.id)} disabled={actioning === e.id} className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300 disabled:opacity-60">Valider</button>
                              <button type="button" onClick={() => handleReject(e.id)} disabled={actioning === e.id} className="text-sm font-medium text-red-400 transition hover:text-red-300 disabled:opacity-60">Rejeter</button>
                            </div>
                          )}
                          {e.status === 'PENDING_COMMISSIONER' && (isCommissioner || isAdmin) && (
                            <div className="flex gap-3">
                              <button type="button" onClick={() => handleValidateCommissioner(e.id)} disabled={actioning === e.id} className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300 disabled:opacity-60">Valider</button>
                              <button type="button" onClick={() => handleReject(e.id)} disabled={actioning === e.id} className="text-sm font-medium text-red-400 transition hover:text-red-300 disabled:opacity-60">Rejeter</button>
                            </div>
                          )}
                          {e.status === 'APPROVED' && <span className="text-sm text-emerald-400">Validée</span>}
                          {e.status === 'REJECTED' && <span className="text-sm text-red-400">Rejetée</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleExpenses.length === 0 && (
            <div className="py-12 text-center text-[var(--afc-muted)]">Aucune dépense ne correspond aux filtres.</div>
          )}
          {expenses.length > 0 && expenses.length >= limit && (
            <div className="border-t border-[var(--afc-border)] px-6 py-3 text-center">
              <button type="button" onClick={() => setLimit((n) => n + 50)} className="text-sm font-medium text-[#C9A048] transition hover:text-[#DDB65C] hover:underline">
                Charger plus de dépenses
              </button>
            </div>
          )}
        </div>
      )}

      {expenseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-[rgba(var(--afc-hl),0.08)] bg-[var(--afc-card)] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--afc-text)]">Détail de la dépense</h3>
              <button type="button" onClick={() => setExpenseDetail(null)} className="text-2xl leading-none text-[var(--afc-muted)] transition hover:text-[var(--afc-text)]">&times;</button>
            </div>
            <div className="space-y-2 text-sm text-[var(--afc-text-soft)]">
              <p><span className="font-medium text-[var(--afc-muted-2)]">Description :</span> {expenseDetail.description}</p>
              <p><span className="font-medium text-[var(--afc-muted-2)]">Montant :</span> {Number(expenseDetail.amount).toLocaleString('fr-FR')} FCFA</p>
              <p><span className="font-medium text-[var(--afc-muted-2)]">Date :</span> {new Date(expenseDetail.expenseDate).toLocaleDateString('fr-FR')}</p>
              <p><span className="font-medium text-[var(--afc-muted-2)]">Caisse :</span> {expenseDetail.cashBox?.name ?? 'Caisse par défaut'}</p>
              <p><span className="font-medium text-[var(--afc-muted-2)]">Bénéficiaire :</span> {expenseDetail.beneficiary ?? '—'}</p>
              <p><span className="font-medium text-[var(--afc-muted-2)]">Demandé par :</span> {expenseDetail.requestedBy.firstName} {expenseDetail.requestedBy.lastName}</p>
              <p><span className="font-medium text-[var(--afc-muted-2)]">Statut :</span> {statusLabel(expenseDetail.status).text}</p>
            </div>
            <button type="button" onClick={() => setExpenseDetail(null)} className="afc-button-primary w-full">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

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
      return { text: 'En attente trésorier', color: 'bg-amber-100 text-amber-800' };
    case 'PENDING_COMMISSIONER':
      return { text: 'En attente commissaire', color: 'bg-blue-100 text-blue-800' };
    case 'APPROVED':
      return { text: 'Approuvée', color: 'bg-green-100 text-green-800' };
    case 'REJECTED':
      return { text: 'Rejetée', color: 'bg-red-100 text-red-800' };
    default:
      return { text: status, color: 'bg-gray-100 text-gray-800' };
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
    return <div className="card py-12 text-center text-gray-500">Accès réservé au bureau.</div>;
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Dépenses</h1>
          <p className="text-gray-500 text-sm mt-1">Sorties de caisse</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center justify-end gap-3">
          {canCreate && (
            <Link href="/dashboard/caisse/nouvelle-depense" className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Ajouter une dépense
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card py-20 text-center text-sm text-slate-500">Chargement des dépenses…</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="input-field w-full pl-10" placeholder="Libellé, bénéficiaire ou demandeur…" value={query} onChange={(e)=>setQuery(e.target.value)}/></div>
            <select className="input-field min-w-56" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}><option value="ALL">Tous les statuts</option><option value="PENDING_TREASURER">En attente trésorier</option><option value="PENDING_COMMISSIONER">En attente commissaire</option><option value="APPROVED">Approuvées</option><option value="REJECTED">Rejetées</option></select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-[var(--sky-blue-soft)]">
                  <th className="px-6 py-4 text-sm font-semibold text-[var(--sky-blue-dark)]">Date</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Sous-caisse</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Description</th>
                  <th className="hidden px-6 py-4 text-sm font-semibold text-gray-600 xl:table-cell">Catégorie</th>
                  <th className="hidden px-6 py-4 text-sm font-semibold text-gray-600 2xl:table-cell">Bénéficiaire</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Montant</th>
                  <th className="hidden px-6 py-4 text-sm font-semibold text-gray-600 2xl:table-cell">Demandé par</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Statut</th>
                  <th className="hidden px-6 py-4 text-sm font-semibold text-gray-600 2xl:table-cell">Motif rejet</th>
                  {canAct && <th className="px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visibleExpenses.map((e) => {
                  const status = statusLabel(e.status);
                  return (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
                        {new Date(e.expenseDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {e.cashBox?.name ?? 'Caisse par défaut'}
                      </td>
                      <td className="max-w-0 px-4 py-4 font-medium text-[var(--foreground)]">
                        <button
                          type="button"
                          onClick={() => setExpenseDetail(e)}
                          className="block max-w-full truncate text-left hover:text-[var(--sky-blue-dark)] hover:underline"
                          title="Cliquer pour voir la description complète"
                        >
                          {e.description}
                        </button>
                      </td>
                      <td className="hidden px-6 py-4 text-sm text-gray-600 xl:table-cell">{e.category?.name ?? '—'}</td>
                      <td className="hidden px-6 py-4 text-sm text-gray-600 2xl:table-cell">{e.beneficiary ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                        {Number(e.amount).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="hidden px-6 py-4 text-sm text-gray-600 2xl:table-cell">
                        {e.requestedBy.firstName} {e.requestedBy.lastName}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="hidden max-w-[200px] truncate px-6 py-4 text-sm text-gray-600 2xl:table-cell" title={e.rejectReason ?? undefined}>
                        {e.status === 'REJECTED' && e.rejectReason ? e.rejectReason : '—'}
                      </td>
                      {canAct && (
                        <td className="px-6 py-4">
                          {e.status === 'PENDING_TREASURER' && (isTreasurer || isAdmin) && (
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleValidateTreasurer(e.id)} disabled={actioning === e.id} className="text-sm text-green-700 hover:underline disabled:opacity-60">Valider</button>
                              <button type="button" onClick={() => handleReject(e.id)} disabled={actioning === e.id} className="text-sm text-red-600 hover:underline disabled:opacity-60">Rejeter</button>
                            </div>
                          )}
                          {e.status === 'PENDING_COMMISSIONER' && (isCommissioner || isAdmin) && (
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleValidateCommissioner(e.id)} disabled={actioning === e.id} className="text-sm text-green-700 hover:underline disabled:opacity-60">Valider</button>
                              <button type="button" onClick={() => handleReject(e.id)} disabled={actioning === e.id} className="text-sm text-red-600 hover:underline disabled:opacity-60">Rejeter</button>
                            </div>
                          )}
                          {e.status === 'APPROVED' && <span className="text-sm text-green-600">Validée</span>}
                          {e.status === 'REJECTED' && <span className="text-sm text-red-600">Rejetée</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleExpenses.length === 0 && (
            <div className="py-12 text-center text-gray-500">Aucune dépense ne correspond aux filtres.</div>
          )}
          {expenses.length > 0 && expenses.length >= limit && (
            <div className="px-6 py-3 border-t border-gray-100 text-center">
              <button type="button" onClick={() => setLimit((n) => n + 50)} className="text-sm text-[var(--sky-blue)] hover:underline font-medium">
                Charger plus de dépenses
              </button>
            </div>
          )}
        </div>
      )}

      {expenseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--foreground)]">Détail de la dépense</h3>
              <button type="button" onClick={() => setExpenseDetail(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium text-gray-700">Description :</span> {expenseDetail.description}</p>
              <p><span className="font-medium text-gray-700">Montant :</span> {Number(expenseDetail.amount).toLocaleString('fr-FR')} FCFA</p>
              <p><span className="font-medium text-gray-700">Date :</span> {new Date(expenseDetail.expenseDate).toLocaleDateString('fr-FR')}</p>
              <p><span className="font-medium text-gray-700">Caisse :</span> {expenseDetail.cashBox?.name ?? 'Caisse par défaut'}</p>
              <p><span className="font-medium text-gray-700">Bénéficiaire :</span> {expenseDetail.beneficiary ?? '—'}</p>
              <p><span className="font-medium text-gray-700">Demandé par :</span> {expenseDetail.requestedBy.firstName} {expenseDetail.requestedBy.lastName}</p>
              <p><span className="font-medium text-gray-700">Statut :</span> {statusLabel(expenseDetail.status).text}</p>
            </div>
            <button type="button" onClick={() => setExpenseDetail(null)} className="btn-primary w-full">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { caisseApi, contributionsApi, type CaisseSummary, type Expense, type LivreEntry, type Payment, type CashBoxSummary, type CashBoxTransfer } from '@/lib/api';

const CAISSE_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];
const CAN_CREATE_EXPENSE = ['ADMIN', 'TREASURER'];
const CAN_CREATE_TRANSFER = ['ADMIN'];

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

export default function CaissePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<CaisseSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [livre, setLivre] = useState<LivreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [expensesLimit, setExpensesLimit] = useState(50);
  const [transfersLimit, setTransfersLimit] = useState(30);
  const [paymentsLimit, setPaymentsLimit] = useState(50);
  const [livreLimit, setLivreLimit] = useState(100);
  const [newBoxName, setNewBoxName] = useState('');
  const [newBoxDescription, setNewBoxDescription] = useState('');
  const [newBoxDefault, setNewBoxDefault] = useState(false);
  const [managingBoxes, setManagingBoxes] = useState(false);
  const [transfers, setTransfers] = useState<CashBoxTransfer[]>([]);
  const [managingTransfers, setManagingTransfers] = useState(false);
  const [transferType, setTransferType] = useState<'ALLOCATION' | 'WITHDRAWAL'>('ALLOCATION');
  const [transferCashBoxId, setTransferCashBoxId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const created = searchParams.get('created') === '1';

  const canAct = user && CAISSE_ROLES.includes(user.role);
  const canCreate = user && CAN_CREATE_EXPENSE.includes(user.role);
  const canCreateTransfer = user && CAN_CREATE_TRANSFER.includes(user.role);
  const isAdmin = user?.role === 'ADMIN';
  const isTreasurer = user?.role === 'TREASURER';
  const isCommissioner = user?.role === 'COMMISSIONER';

  const last6Months = useMemo(() => {
    const now = new Date();
    const out: { year: number; month: number; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' }),
      });
    }
    return out;
  }, []);

  const livreByMonth = useMemo(() => {
    return last6Months.map(({ year, month, label }) => {
      let entrées = 0;
      let sorties = 0;
      livre.forEach((entry) => {
        const d = new Date(entry.date);
        if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
        const amt = Number(entry.amount);
        if (entry.type === 'entree') entrées += amt;
        else sorties += amt;
      });
      return { mois: label, entrées, sorties };
    });
  }, [livre, last6Months]);

  const boxPieData = useMemo(() => {
    if (!summary) return [];
    return summary.boxes
      .filter((b) => b.solde > 0)
      .map((b, i) => ({
        name: b.name,
        value: b.solde,
        color: ['var(--sky-blue)', '#22c55e', '#f59e0b', '#8b5cf6'][i % 4],
      }));
  }, [summary]);

  const hasLivreChartData = livreByMonth.some((m) => m.entrées > 0 || m.sorties > 0);

  const load = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      caisseApi.summary(),
      caisseApi.expenses(undefined, expensesLimit),
      contributionsApi.payments({ limit: paymentsLimit }),
      caisseApi.livre(livreLimit),
      caisseApi.transfers(undefined, transfersLimit),
    ])
      .then(([s, e, p, l, tr]) => {
        setSummary(s);
        setExpenses(e);
        setPayments(p);
        setLivre(l);
        setTransfers(tr ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => {
        setLoading(false);
        window.dispatchEvent(new Event('caisse-expenses-updated'));
      });
  };

  useEffect(() => {
    load();
  }, [user, expensesLimit, transfersLimit, paymentsLimit, livreLimit]);

  useEffect(() => {
    if (!created) return;
    const t = setTimeout(() => router.replace('/dashboard/caisse'), 5000);
    return () => clearTimeout(t);
  }, [created, router]);

  const dismissCreatedBanner = () => router.replace('/dashboard/caisse');

  const handleValidateTreasurer = (id: string) => {
    setError(null);
    setActioning(id);
    caisseApi
      .validateTreasurer(id)
      .then(() => load())
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setActioning(null));
  };

  const handleValidateCommissioner = (id: string) => {
    setError(null);
    setActioning(id);
    caisseApi
      .validateCommissioner(id)
      .then(() => load())
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setActioning(null));
  };

  const handleReject = (id: string) => {
    if (!confirm('Rejeter cette dépense ?')) return;
    const motif = window.prompt('Motif du rejet (optionnel, 500 caractères max) :');
    if (motif !== null) {
      setError(null);
      setActioning(id);
      caisseApi
        .rejectExpense(id, motif.trim() || undefined)
        .then(() => load())
        .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
        .finally(() => setActioning(null));
    }
  };

  const handleValidateTransferTreasurer = (id: string) => {
    setError(null);
    setActioning(id);
    caisseApi
      .validateTransferTreasurer(id)
      .then(() => load())
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setActioning(null));
  };

  const handleValidateTransferCommissioner = (id: string) => {
    setError(null);
    setActioning(id);
    caisseApi
      .validateTransferCommissioner(id)
      .then(() => load())
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setActioning(null));
  };

  const handleRejectTransfer = (id: string) => {
    if (!confirm('Rejeter ce mouvement entre caisses ?')) return;
    const motif = window.prompt('Motif du rejet (optionnel) :');
    if (motif !== null) {
      setError(null);
      setActioning(id);
      caisseApi
        .rejectTransfer(id, motif.trim() || undefined)
        .then(() => load())
        .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
        .finally(() => setActioning(null));
    }
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(transferAmount);
    if (!transferCashBoxId || !Number.isFinite(amount) || amount <= 0) {
      setError('Choisissez une sous-caisse et un montant strictement positif.');
      return;
    }
    setError(null);
    setTransferSubmitting(true);
    caisseApi
      .createTransfer({
        type: transferType,
        cashBoxId: transferCashBoxId,
        amount,
        description: transferDescription.trim() || undefined,
      })
      .then(() => {
        setTransferAmount('');
        setTransferDescription('');
        setTransferCashBoxId('');
        load();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setTransferSubmitting(false));
  };

  const handleAddCashBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoxName.trim()) return;
    setError(null);
    caisseApi
      .createCashBox({
        name: newBoxName.trim(),
        description: newBoxDescription.trim() || undefined,
        isDefault: newBoxDefault,
      })
      .then(() => {
        setNewBoxName('');
        setNewBoxDescription('');
        setNewBoxDefault(false);
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  };

  const handleSetDefaultBox = (id: string) => {
    setError(null);
    caisseApi.updateCashBox(id, { isDefault: true }).then(() => load()).catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  };

  const handleDeleteCashBox = (id: string, name: string) => {
    if (!confirm(`Supprimer la sous-caisse « ${name} » ? Les mouvements seront rattachés à la caisse par défaut.`)) return;
    setError(null);
    caisseApi.deleteCashBox(id).then(() => load()).catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Caisse</h1>
          <p className="text-gray-600 mt-1">
            {canAct
              ? 'Solde et dépenses. Validation en 2 niveaux : Trésorier puis Commissaire aux comptes.'
              : 'Consultation en lecture seule — transparence totale sur les entrées, sorties et soldes.'}
          </p>
        </div>
        {canCreate && (
          <Link href="/dashboard/caisse/nouvelle-depense" className="btn-primary inline-flex items-center justify-center shrink-0">
            Nouvelle dépense
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>
      )}
      {created && (
        <div className="rounded-xl bg-green-50 text-green-800 px-4 py-3 flex items-center justify-between gap-4">
          <p className="flex-1">
            Dépense créée. Elle doit être validée par le Trésorier puis par le Commissaire aux comptes.
          </p>
          <button
            type="button"
            onClick={dismissCreatedBanner}
            className="shrink-0 text-green-700 hover:text-green-900 font-medium underline"
            aria-label="Fermer"
          >
            Fermer
          </button>
        </div>
      )}

      {loading ? (
        <div className="card flex justify-center py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
        </div>
      ) : (
        <>
          {summary && (
            <>
              <section>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Sous-caisses</h2>
                <p className="text-sm text-gray-500 mb-4">
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {summary.boxes.map((box: CashBoxSummary) => (
                    <div
                      key={box.id}
                      className={`card border-l-4 ${box.isDefault ? 'border-l-[var(--sky-blue)]' : 'border-l-emerald-500'}`}
                    >
                      <div>
                        <h3 className="font-semibold text-[var(--foreground)]">{box.name}</h3>
                        {box.isDefault && (
                          <span className="text-xs text-gray-500">Par défaut</span>
                        )}
                      </div>
                      <p className="mt-2 text-2xl font-bold text-[var(--sky-blue-dark)]">
                        {box.solde.toLocaleString('fr-FR')} FCFA
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Entrées {box.totalEntries.toLocaleString('fr-FR')} − Sorties {box.totalExits.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card border-l-4 border-l-slate-400">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Solde global</h2>
                  <p className="mt-2 text-2xl font-bold text-[var(--sky-blue-dark)]">
                    {summary.global.solde.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="card">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total entrées</h2>
                  <p className="mt-2 text-xl font-semibold text-green-700">
                    {summary.global.totalEntries.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="card">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total sorties (approuvées)</h2>
                  <p className="mt-2 text-xl font-semibold text-red-700">
                    {summary.global.totalExits.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="card border-l-4 border-l-amber-500">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dépenses en attente</h2>
                  <p className="mt-2 text-xl font-semibold text-amber-700">
                    {expenses.filter((e) => e.status === 'PENDING_TREASURER' || e.status === 'PENDING_COMMISSIONER').length}
                  </p>
                </div>
              </div>

              {/* Graphiques KPI caisse */}
              {hasLivreChartData && (
                <section className="card">
                  <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 pb-2 border-b border-slate-100">
                    Activité du livre de caisse (6 derniers mois)
                  </h2>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={livreByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: number | undefined) => [Number(value ?? 0).toLocaleString('fr-FR') + ' FCFA', '']}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Legend />
                        <Bar dataKey="entrées" name="Entrées" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="sorties" name="Sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
              {summary.boxes.length > 1 && boxPieData.length > 0 && (
                <section className="card">
                  <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 pb-2 border-b border-slate-100">
                    Répartition du solde par sous-caisse
                  </h2>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={boxPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, value }) => `${name}: ${(value / 1000).toFixed(0)}k`}
                        >
                          {boxPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number | undefined) => [Number(value ?? 0).toLocaleString('fr-FR') + ' FCFA', 'Solde']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {canAct && isAdmin && (
                <section className="card">
                  <button
                    type="button"
                    onClick={() => setManagingBoxes(!managingBoxes)}
                    className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2"
                  >
                    Gérer les sous-caisses
                    <span className="text-sm font-normal text-gray-500">(Admin)</span>
                    <span className="text-gray-400">{managingBoxes ? '▼' : '▶'}</span>
                  </button>
                  {managingBoxes && (
                    <div className="mt-4 space-y-4">
                      <form onSubmit={handleAddCashBox} className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-xl">
                        <div className="min-w-[180px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle sous-caisse</label>
                          <input
                            type="text"
                            value={newBoxName}
                            onChange={(e) => setNewBoxName(e.target.value)}
                            placeholder="Ex. Événements"
                            className="input-field"
                          />
                        </div>
                        <div className="min-w-[180px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
                          <input
                            type="text"
                            value={newBoxDescription}
                            onChange={(e) => setNewBoxDescription(e.target.value)}
                            placeholder="Ex. Caisse dédiée aux événements"
                            className="input-field"
                          />
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newBoxDefault}
                            onChange={(e) => setNewBoxDefault(e.target.checked)}
                          />
                          <span className="text-sm text-gray-700">Par défaut</span>
                        </label>
                        <button type="submit" className="btn-primary">Ajouter</button>
                      </form>
                      <ul className="divide-y divide-gray-100">
                        {summary.boxes.map((box: CashBoxSummary) => (
                          <li key={box.id} className="py-3 flex items-center justify-between gap-4">
                            <span className="font-medium">{box.name}{box.isDefault ? ' (par défaut)' : ''}</span>
                            <div className="flex gap-2">
                              {!box.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultBox(box.id)}
                                  className="text-sm text-[var(--sky-blue)] hover:underline"
                                >
                                  Définir par défaut
                                </button>
                              )}
                              {!box.isDefault && summary.boxes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCashBox(box.id, box.name)}
                                  className="text-sm text-red-600 hover:underline"
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {canCreateTransfer && summary && summary.boxes.length > 1 && (
                <section className="card">
                  <button
                    type="button"
                    onClick={() => setManagingTransfers(!managingTransfers)}
                    className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2"
                  >
                    Mouvements entre caisses (allocations / retraits)
                    <span className="text-sm font-normal text-gray-500">(Admin + accord Trésorier & Commissaire)</span>
                    <span className="text-gray-400">{managingTransfers ? '▼' : '▶'}</span>
                  </button>
                  {managingTransfers && (
                    <div className="mt-4 space-y-4">
                      <form onSubmit={handleCreateTransfer} className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-xl">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={transferType}
                            onChange={(e) => setTransferType(e.target.value as 'ALLOCATION' | 'WITHDRAWAL')}
                            className="input-field"
                          >
                            <option value="ALLOCATION">Allocation (dépôt vers sous-caisse)</option>
                            <option value="WITHDRAWAL">Retrait (sortie depuis sous-caisse)</option>
                          </select>
                        </div>
                        <div className="min-w-[180px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {transferType === 'ALLOCATION' ? 'Sous-caisse à créditer' : 'Sous-caisse à débiter'}
                          </label>
                          <select
                            value={transferCashBoxId}
                            onChange={(e) => setTransferCashBoxId(e.target.value)}
                            className="input-field"
                            required
                          >
                            <option value="">Choisir…</option>
                            {summary.boxes
                              .filter((b) => !b.isDefault)
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}{b.isDefault ? ' (par défaut)' : ''}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA)</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            className="input-field w-32"
                            placeholder="0"
                            required
                          />
                        </div>
                        <div className="min-w-[200px] flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
                          <input
                            type="text"
                            value={transferDescription}
                            onChange={(e) => setTransferDescription(e.target.value)}
                            className="input-field"
                            placeholder="Ex. Budget événement mars"
                          />
                        </div>
                        <button type="submit" className="btn-primary" disabled={transferSubmitting}>
                          {transferType === 'ALLOCATION' ? 'Allouer' : 'Retirer'}
                        </button>
                      </form>
                    </div>
                  )}
                </section>
              )}

              {transfers.length > 0 && (
                <section className="card overflow-hidden p-0">
                  <h2 className="px-6 py-4 text-lg font-semibold text-[var(--foreground)] border-b border-gray-100">
                    Mouvements entre caisses (en attente ou récents)
                  </h2>
                  <p className="px-6 py-2 text-sm text-gray-500 border-b border-gray-50">
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-slate-50">
                          <th className="px-6 py-3 text-sm font-semibold text-gray-700">Date</th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600">Type</th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600">De → Vers</th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600">Demandé par</th>
                          {canAct && <th className="px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((t) => {
                          const status = statusLabel(t.status);
                          const amount = typeof t.amount === 'object' && t.amount && 'toNumber' in t.amount ? (t.amount as { toNumber: () => number }).toNumber() : Number(t.amount);
                          return (
                            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="px-6 py-3 text-gray-600 text-sm whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-6 py-3">
                                <span
                                  className={
                                    t.type === 'ALLOCATION'
                                      ? 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800'
                                      : 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800'
                                  }
                                >
                                  {t.type === 'ALLOCATION' ? 'Allocation' : 'Retrait'}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-700">
                                {t.fromCashBox?.name ?? 'Caisse par défaut'} → {t.toCashBox?.name ?? 'Caisse par défaut'}
                              </td>
                              <td className="px-6 py-3 font-medium text-gray-800">
                                {amount.toLocaleString('fr-FR')} FCFA
                              </td>
                              <td className="px-6 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                                  {status.text}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-600">
                                {t.requestedBy.firstName} {t.requestedBy.lastName}
                              </td>
                              {canAct && (
                                <td className="px-6 py-3">
                                  {t.status === 'PENDING_TREASURER' && (isTreasurer || isAdmin) && (
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleValidateTransferTreasurer(t.id)}
                                        disabled={actioning === t.id}
                                        className="text-sm text-green-700 hover:underline disabled:opacity-60"
                                      >
                                        Valider
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRejectTransfer(t.id)}
                                        disabled={actioning === t.id}
                                        className="text-sm text-red-600 hover:underline disabled:opacity-60"
                                      >
                                        Rejeter
                                      </button>
                                    </div>
                                  )}
                                  {t.status === 'PENDING_COMMISSIONER' && (isCommissioner || isAdmin) && (
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleValidateTransferCommissioner(t.id)}
                                        disabled={actioning === t.id}
                                        className="text-sm text-green-700 hover:underline disabled:opacity-60"
                                      >
                                        Valider
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRejectTransfer(t.id)}
                                        disabled={actioning === t.id}
                                        className="text-sm text-red-600 hover:underline disabled:opacity-60"
                                      >
                                        Rejeter
                                      </button>
                                    </div>
                                  )}
                                  {(t.status === 'APPROVED' || t.status === 'REJECTED') && (
                                    <span className="text-sm text-gray-500">
                                      {t.status === 'APPROVED' ? 'Validé' : 'Rejeté'}
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {transfers.length > 0 && transfers.length >= transfersLimit && (
                    <div className="px-6 py-3 border-t border-gray-100 text-center">
                      <button
                        type="button"
                        onClick={() => setTransfersLimit((n) => n + 30)}
                        className="text-sm text-[var(--sky-blue)] hover:underline font-medium"
                      >
                        Charger plus de mouvements
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          <section className="card overflow-hidden p-0">
            <h2 className="px-6 py-4 text-lg font-semibold text-[var(--foreground)] border-b border-gray-100">
              Livre de caisse
            </h2>
            <p className="px-6 py-2 text-sm text-gray-500 border-b border-gray-50">
              Historique unifié : cotisations, allocations vers sous-caisses, dépenses et retraits.
            </p>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white border-b border-gray-100">
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">Libellé / Bénéficiaire</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {livre.map((entry) => (
                    <tr key={`${entry.type}-${entry.id}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {new Date(entry.date).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={
                            entry.type === 'entree'
                              ? 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800'
                              : 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-100 text-rose-800'
                          }
                        >
                          {entry.type === 'entree' ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[var(--foreground)]">
                        {entry.type === 'entree' ? (
                          <>
                            {entry.label}
                            {entry.periodYear != null && entry.periodMonth != null && (
                              <span className="text-gray-500 text-sm ml-1">
                                ({new Date(entry.periodYear, entry.periodMonth - 1).toLocaleString('fr-FR', {
                                  month: 'long',
                                  year: 'numeric',
                                })})
                              </span>
                            )}
                            {entry.kind === 'allocation' && entry.description && (
                              <span className="block text-sm text-gray-600 mt-0.5">{entry.description}</span>
                            )}
                          </>
                        ) : (
                          <>
                            {entry.label ?? entry.description ?? '—'}
                            {entry.beneficiary && (
                              <span className="block text-sm text-gray-600 mt-0.5">Bénéficiaire : {entry.beneficiary}</span>
                            )}
                            {entry.kind === 'withdrawal' && entry.description && (
                              <span className="block text-sm text-gray-600 mt-0.5">{entry.description}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td
                        className={`px-6 py-3 font-medium ${entry.type === 'entree' ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {entry.type === 'entree' ? '+' : '−'}
                        {entry.amount.toLocaleString('fr-FR')} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {livre.length === 0 && (
              <div className="py-8 text-center text-gray-500 text-sm">Aucun mouvement enregistré.</div>
            )}
            {livre.length > 0 && livre.length >= livreLimit && (
              <div className="px-6 py-3 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => setLivreLimit((n) => n + 100)}
                  className="text-sm text-[var(--sky-blue)] hover:underline font-medium"
                >
                  Charger plus de mouvements
                </button>
              </div>
            )}
          </section>

          <div className="card overflow-hidden p-0">
            <h2 className="px-6 py-4 text-lg font-semibold text-[var(--foreground)] border-b border-gray-100">
              Entrées récentes
            </h2>
            <p className="px-6 py-2 text-sm text-gray-500 border-b border-gray-50">
              Derniers paiements de cotisations enregistrés.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-emerald-50/80">
                    <th className="px-6 py-3 text-sm font-semibold text-gray-700">Membre</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">Cotisation</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">Période</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">Date paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-[var(--foreground)]">
                        {p.member
                          ? `${p.member.firstName} ${p.member.lastName}`
                          : `Membre ${p.memberId}`}
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-sm">
                        {p.contribution?.name ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-sm">
                        {p.periodYear != null && p.periodMonth != null
                          ? new Date(p.periodYear, p.periodMonth - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-6 py-3 text-green-700 font-medium">
                        {Number(p.amount).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-sm">
                        {new Date(p.paidAt).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payments.length === 0 && (
              <div className="py-8 text-center text-gray-500 text-sm">Aucun paiement enregistré.</div>
            )}
            {payments.length > 0 && payments.length >= paymentsLimit && (
              <div className="px-6 py-3 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => setPaymentsLimit((n) => n + 50)}
                  className="text-sm text-[var(--sky-blue)] hover:underline font-medium"
                >
                  Charger plus de paiements
                </button>
              </div>
            )}
          </div>

          <div className="card overflow-hidden p-0">
            <h2 className="px-6 py-4 text-lg font-semibold text-[var(--foreground)] border-b border-gray-100">
              Dépenses
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-[var(--sky-blue-soft)]">
                    <th className="px-6 py-4 text-sm font-semibold text-[var(--sky-blue-dark)]">Date</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Sous-caisse</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Description</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Bénéficiaire</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Montant</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Demandé par</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Statut</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Motif rejet</th>
                    {canAct && <th className="px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => {
                    const status = statusLabel(e.status);
                    return (
                      <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {new Date(e.expenseDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {e.cashBox?.name ?? 'Caisse par défaut'}
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--foreground)]">{e.description}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {e.beneficiary ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {Number(e.amount).toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {e.requestedBy.firstName} {e.requestedBy.lastName}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={e.rejectReason ?? undefined}>
                          {e.status === 'REJECTED' && e.rejectReason ? e.rejectReason : '—'}
                        </td>
                        {canAct && (
                        <td className="px-6 py-4">
                          {e.status === 'PENDING_TREASURER' && (isTreasurer || isAdmin) && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleValidateTreasurer(e.id)}
                                disabled={actioning === e.id}
                                className="text-sm text-green-700 hover:underline disabled:opacity-60"
                              >
                                Valider
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(e.id)}
                                disabled={actioning === e.id}
                                className="text-sm text-red-600 hover:underline disabled:opacity-60"
                              >
                                Rejeter
                              </button>
                            </div>
                          )}
                          {e.status === 'PENDING_COMMISSIONER' && (isCommissioner || isAdmin) && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleValidateCommissioner(e.id)}
                                disabled={actioning === e.id}
                                className="text-sm text-green-700 hover:underline disabled:opacity-60"
                              >
                                Valider
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(e.id)}
                                disabled={actioning === e.id}
                                className="text-sm text-red-600 hover:underline disabled:opacity-60"
                              >
                                Rejeter
                              </button>
                            </div>
                          )}
                          {e.status === 'APPROVED' && (
                            <span className="text-sm text-green-600">Validée</span>
                          )}
                          {e.status === 'REJECTED' && (
                            <span className="text-sm text-red-600">Rejetée</span>
                          )}
                        </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {expenses.length === 0 && (
              <div className="py-12 text-center text-gray-500">Aucune dépense pour le moment.</div>
            )}
            {expenses.length > 0 && expenses.length >= expensesLimit && (
              <div className="px-6 py-3 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => setExpensesLimit((n) => n + 50)}
                  className="text-sm text-[var(--sky-blue)] hover:underline font-medium"
                >
                  Charger plus de dépenses
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

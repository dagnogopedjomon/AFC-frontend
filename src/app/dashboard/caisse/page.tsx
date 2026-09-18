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
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { confirmAction } from '@/lib/swal';
import { caisseApi, type CaisseSummary, type Expense, type LivreEntry, type CashBoxSummary, type CashBoxTransfer } from '@/lib/api';

const CAISSE_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];
const CAN_CREATE_EXPENSE = ['ADMIN', 'TREASURER'];
const CAN_CREATE_TRANSFER = ['ADMIN'];

const formatAxis = (v: number) => (v >= 1000 ? Math.round(v / 1000) + 'k' : String(v));
const PIE_COLORS = ['#C9A048', '#2E5FA3', '#4B9E7A', '#9B7ED8'];

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

export default function CaissePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<CaisseSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [livre, setLivre] = useState<LivreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [expensesLimit, setExpensesLimit] = useState(50);
  const [transfersLimit, setTransfersLimit] = useState(30);
  const [livreLimit, setLivreLimit] = useState(100);
  const [newBoxName, setNewBoxName] = useState('');
  const [newBoxDescription, setNewBoxDescription] = useState('');
  const [newBoxOpeningBalance, setNewBoxOpeningBalance] = useState('');
  const [managingBoxes, setManagingBoxes] = useState(false);
  const [transfers, setTransfers] = useState<CashBoxTransfer[]>([]);
  const [managingTransfers, setManagingTransfers] = useState(false);
  const [transferType, setTransferType] = useState<'ALLOCATION' | 'WITHDRAWAL'>('ALLOCATION');
  const [transferCashBoxId, setTransferCashBoxId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [expenseDetail, setExpenseDetail] = useState<Expense | null>(null);
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
      return { mois: label, Entrées: entrées, Sorties: sorties };
    });
  }, [livre, last6Months]);

  const boxPieData = useMemo(() => {
    if (!summary) return [];
    return summary.boxes
      .filter((b) => b.solde > 0)
      .map((b, i) => ({
        name: b.name,
        value: b.solde,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));
  }, [summary]);

  const hasLivreChartData = livreByMonth.some((m) => m.Entrées > 0 || m.Sorties > 0);

  const load = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      caisseApi.summary(),
      caisseApi.expenses(undefined, expensesLimit),
      caisseApi.livre(livreLimit),
      caisseApi.transfers(undefined, transfersLimit),
    ])
      .then(([s, e, l, tr]) => {
        setSummary(s);
        setExpenses(e);
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
  }, [user, expensesLimit, transfersLimit, livreLimit]);

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

  const handleReject = async (id: string) => {
    const confirmation = await confirmAction('Rejeter cette dépense ?', 'Vous pourrez préciser le motif juste après.');
    if (!confirmation.isConfirmed) return;
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

  const handleRejectTransfer = async (id: string) => {
    const confirmation = await confirmAction('Rejeter ce mouvement ?', 'Vous pourrez préciser le motif juste après.');
    if (!confirmation.isConfirmed) return;
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
        openingBalance: newBoxOpeningBalance ? Number(newBoxOpeningBalance) : 0,
      })
      .then(() => {
        setNewBoxName('');
        setNewBoxDescription('');
        setNewBoxOpeningBalance('');
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  };

  const handleSetDefaultBox = (id: string) => {
    setError(null);
    caisseApi.updateCashBox(id, { isDefault: true }).then(() => load()).catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  };

  const handleSetOpeningBalance = (box: CashBoxSummary) => {
    const value = window.prompt(`Fonds déjà disponibles dans « ${box.name} » (FCFA) :`, String(box.openingBalance ?? 0));
    if (value === null) return;
    const amount = Number(value.replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Le montant initial doit être un nombre positif ou nul.');
      return;
    }
    setError(null);
    caisseApi.updateCashBox(box.id, { openingBalance: amount }).then(() => load()).catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  };

  const handleDeleteCashBox = async (id: string, name: string) => {
    const confirmation = await confirmAction('Supprimer cette sous-caisse ?', `« ${name} » sera supprimée et ses mouvements seront rattachés à la caisse par défaut.`);
    if (!confirmation.isConfirmed) return;
    setError(null);
    caisseApi.deleteCashBox(id).then(() => load()).catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Caisse</h1>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">
            {canAct
              ? 'Solde et dépenses. Validation en 2 niveaux : Trésorier puis Commissaire aux comptes.'
              : 'Consultation en lecture seule — transparence totale sur les entrées, sorties et soldes.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/dashboard/cotisations/paiement" className="afc-button-primary"><Plus size={15} strokeWidth={2} aria-hidden="true" /> Nouveau paiement</Link>
          {canCreate && <Link href="/dashboard/caisse/nouvelle-depense" className="afc-button-primary"><Plus size={15} strokeWidth={2} aria-hidden="true" /> Ajouter une dépense</Link>}
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-3 text-red-400">{error}</div>
      )}
      {created && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-700/30 bg-emerald-900/20 px-4 py-3 text-emerald-400">
          <p className="flex-1">
            Dépense créée. Elle doit être validée par le Trésorier puis par le Commissaire aux comptes.
          </p>
          <button
            type="button"
            onClick={dismissCreatedBanner}
            className="shrink-0 font-medium text-emerald-300 underline transition hover:text-emerald-200"
            aria-label="Fermer"
          >
            Fermer
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
        </div>
      ) : (
        <>
          {summary && (
            <>
              <section>
                <h2 className="mb-3 text-lg font-semibold text-[var(--afc-text)]">Sous-caisses</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {summary.boxes.map((box: CashBoxSummary) => (
                    <div key={box.id} className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                      <div>
                        <h3 className="font-semibold text-[var(--afc-text)]">{box.name}</h3>
                        {box.isDefault && (
                          <span className="text-xs text-[var(--afc-muted)]">Par défaut</span>
                        )}
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-[#C9A048]">
                        {box.solde.toLocaleString('fr-FR')} FCFA
                      </p>
                      <p className="mt-1 text-xs text-[var(--afc-muted)]">
                        Entrées {box.totalEntries.toLocaleString('fr-FR')} − Sorties {box.totalExits.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--afc-muted)]">Solde global</h2>
                  <p className="mt-2 text-2xl font-semibold text-[var(--afc-text)]">
                    {summary.global.solde.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--afc-muted)]">Total entrées</h2>
                  <p className="mt-2 text-xl font-semibold text-emerald-400">
                    {summary.global.totalEntries.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--afc-muted)]">Total sorties (approuvées)</h2>
                  <p className="mt-2 text-xl font-semibold text-red-400">
                    {summary.global.totalExits.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--afc-muted)]">Dépenses en attente</h2>
                  <p className="mt-2 text-xl font-semibold text-amber-400">
                    {expenses.filter((e) => e.status === 'PENDING_TREASURER' || e.status === 'PENDING_COMMISSIONER').length}
                  </p>
                </div>
              </div>

              {/* Graphiques KPI caisse */}
              {hasLivreChartData && (
                <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                  <h2 className="text-sm font-medium text-[var(--afc-text)]">Activité du livre de caisse</h2>
                  <p className="text-xs text-[var(--afc-muted)]">Entrées et sorties, 6 derniers mois</p>
                  <div className="mt-4 h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={livreByMonth}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: 'var(--afc-muted)', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--afc-muted)', fontSize: 11 }} tickFormatter={formatAxis} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: '#1D2431', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--afc-text)' }}
                          formatter={(value: number | undefined) => [Number(value ?? 0).toLocaleString('fr-FR') + ' FCFA', '']}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--afc-muted-4)' }} />
                        <Bar dataKey="Entrées" fill="#C9A048" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Sorties" fill="#C9645A" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
              {summary.boxes.length > 1 && boxPieData.length > 0 && (
                <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                  <h2 className="text-sm font-medium text-[var(--afc-text)]">Répartition du solde</h2>
                  <p className="text-xs text-[var(--afc-muted)]">Par sous-caisse</p>
                  <div className="mt-4 h-[220px] w-full">
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
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--afc-card)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#1D2431', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--afc-text)' }}
                          formatter={(value: number | undefined) => [Number(value ?? 0).toLocaleString('fr-FR') + ' FCFA', 'Solde']}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--afc-muted-4)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {canAct && isAdmin && (
                <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                  <button
                    type="button"
                    onClick={() => setManagingBoxes(!managingBoxes)}
                    className="flex items-center gap-2 text-lg font-semibold text-[var(--afc-text)]"
                  >
                    Gérer les sous-caisses
                    <span className="text-sm font-normal text-[var(--afc-muted)]">(Admin)</span>
                    <span className="text-[var(--afc-muted)]">{managingBoxes ? '▼' : '▶'}</span>
                  </button>
                  {managingBoxes && (
                    <div className="mt-4 space-y-4">
                      <form onSubmit={handleAddCashBox} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] p-4">
                        <div className="min-w-[180px]">
                          <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Nouvelle sous-caisse</label>
                          <input
                            type="text"
                            value={newBoxName}
                            onChange={(e) => setNewBoxName(e.target.value)}
                            placeholder="Ex. Événements"
                            className="afc-login-input text-sm"
                          />
                        </div>
                        <div className="min-w-[180px]">
                          <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Fonds déjà disponibles (FCFA)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={newBoxOpeningBalance}
                            onChange={(e) => setNewBoxOpeningBalance(e.target.value)}
                            placeholder="0"
                            className="afc-login-input text-sm"
                          />
                        </div>
                        <div className="min-w-[180px]">
                          <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Description (optionnel)</label>
                          <input
                            type="text"
                            value={newBoxDescription}
                            onChange={(e) => setNewBoxDescription(e.target.value)}
                            placeholder="Ex. Caisse dédiée aux événements"
                            className="afc-login-input text-sm"
                          />
                        </div>
                        <button type="submit" className="afc-button-primary text-sm">Ajouter</button>
                      </form>
                      <ul className="divide-y divide-[rgba(var(--afc-hl),0.06)]">
                        {summary.boxes.map((box: CashBoxSummary) => (
                          <li key={box.id} className="flex items-center justify-between gap-4 py-3">
                            <span className="font-medium text-[var(--afc-text)]">{box.name}{box.isDefault ? ' (par défaut)' : ''}</span>
                            <div className="flex gap-3">
                              {isAdmin && (
                                <button type="button" onClick={() => handleSetOpeningBalance(box)} className="text-sm font-medium text-[#C9A048] transition hover:text-[#DDB65C] hover:underline">
                                  Modifier les fonds
                                </button>
                              )}
                              {!box.isDefault && (
                                <button type="button" onClick={() => handleSetDefaultBox(box.id)} className="text-sm font-medium text-[#C9A048] transition hover:text-[#DDB65C] hover:underline">
                                  Définir par défaut
                                </button>
                              )}
                              {!box.isDefault && summary.boxes.length > 1 && (
                                <button type="button" onClick={() => handleDeleteCashBox(box.id, box.name)} className="text-sm font-medium text-red-400 transition hover:text-red-300 hover:underline">
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
                <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                  <button
                    type="button"
                    onClick={() => setManagingTransfers(!managingTransfers)}
                    className="flex items-center gap-2 text-lg font-semibold text-[var(--afc-text)]"
                  >
                    Mouvements entre caisses (allocations / retraits)
                    <span className="text-sm font-normal text-[var(--afc-muted)]">(Admin + accord Trésorier &amp; Commissaire)</span>
                    <span className="text-[var(--afc-muted)]">{managingTransfers ? '▼' : '▶'}</span>
                  </button>
                  {managingTransfers && (
                    <div className="mt-4 space-y-4">
                      <form onSubmit={handleCreateTransfer} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] p-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Type</label>
                          <select
                            value={transferType}
                            onChange={(e) => setTransferType(e.target.value as 'ALLOCATION' | 'WITHDRAWAL')}
                            className="afc-login-input text-sm"
                          >
                            <option value="ALLOCATION">Allocation (dépôt vers sous-caisse)</option>
                            <option value="WITHDRAWAL">Retrait (sortie depuis sous-caisse)</option>
                          </select>
                        </div>
                        <div className="min-w-[180px]">
                          <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">
                            {transferType === 'ALLOCATION' ? 'Sous-caisse à créditer' : 'Sous-caisse à débiter'}
                          </label>
                          <select
                            value={transferCashBoxId}
                            onChange={(e) => setTransferCashBoxId(e.target.value)}
                            className="afc-login-input text-sm"
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
                          <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Montant (FCFA)</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            className="afc-login-input w-32 text-sm"
                            placeholder="0"
                            required
                          />
                        </div>
                        <div className="min-w-[200px] flex-1">
                          <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Description (optionnel)</label>
                          <input
                            type="text"
                            value={transferDescription}
                            onChange={(e) => setTransferDescription(e.target.value)}
                            className="afc-login-input text-sm"
                            placeholder="Ex. Budget événement mars"
                          />
                        </div>
                        <button type="submit" className="afc-button-primary text-sm" disabled={transferSubmitting}>
                          {transferType === 'ALLOCATION' ? 'Allouer' : 'Retirer'}
                        </button>
                      </form>
                    </div>
                  )}
                </section>
              )}

              {transfers.length > 0 && (
                <section className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
                  <h2 className="border-b border-[var(--afc-border)] px-6 py-4 text-lg font-semibold text-[var(--afc-text)]">
                    Mouvements entre caisses (en attente ou récents)
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="afc-table-dark w-full text-left">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Type</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">De → Vers</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Statut</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Demandé par</th>
                          {canAct && <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((t) => {
                          const status = statusLabel(t.status);
                          const amount = typeof t.amount === 'object' && t.amount && 'toNumber' in t.amount ? (t.amount as { toNumber: () => number }).toNumber() : Number(t.amount);
                          return (
                            <tr key={t.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                              <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--afc-muted-2)]">
                                {new Date(t.createdAt).toLocaleString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-6 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${t.type === 'ALLOCATION' ? 'border border-emerald-700/30 bg-emerald-900/20 text-emerald-400' : 'border border-amber-700/30 bg-amber-900/20 text-amber-400'}`}>
                                  {t.type === 'ALLOCATION' ? 'Allocation' : 'Retrait'}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-sm text-[var(--afc-text-soft)]">
                                {t.fromCashBox?.name ?? 'Caisse par défaut'} → {t.toCashBox?.name ?? 'Caisse par défaut'}
                              </td>
                              <td className="px-6 py-3 font-medium text-[var(--afc-text)]">
                                {amount.toLocaleString('fr-FR')} FCFA
                              </td>
                              <td className="px-6 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                                  {status.text}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-sm text-[var(--afc-muted-2)]">
                                {t.requestedBy.firstName} {t.requestedBy.lastName}
                              </td>
                              {canAct && (
                                <td className="px-6 py-3">
                                  {t.status === 'PENDING_TREASURER' && (isTreasurer || isAdmin) && (
                                    <div className="flex gap-3">
                                      <button type="button" onClick={() => handleValidateTransferTreasurer(t.id)} disabled={actioning === t.id} className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300 disabled:opacity-60">Valider</button>
                                      <button type="button" onClick={() => handleRejectTransfer(t.id)} disabled={actioning === t.id} className="text-sm font-medium text-red-400 transition hover:text-red-300 disabled:opacity-60">Rejeter</button>
                                    </div>
                                  )}
                                  {t.status === 'PENDING_COMMISSIONER' && (isCommissioner || isAdmin) && (
                                    <div className="flex gap-3">
                                      <button type="button" onClick={() => handleValidateTransferCommissioner(t.id)} disabled={actioning === t.id} className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300 disabled:opacity-60">Valider</button>
                                      <button type="button" onClick={() => handleRejectTransfer(t.id)} disabled={actioning === t.id} className="text-sm font-medium text-red-400 transition hover:text-red-300 disabled:opacity-60">Rejeter</button>
                                    </div>
                                  )}
                                  {(t.status === 'APPROVED' || t.status === 'REJECTED') && (
                                    <span className="text-sm text-[var(--afc-muted)]">
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
                    <div className="border-t border-[var(--afc-border)] px-6 py-3 text-center">
                      <button type="button" onClick={() => setTransfersLimit((n) => n + 30)} className="text-sm font-medium text-[#C9A048] transition hover:text-[#DDB65C] hover:underline">
                        Charger plus de mouvements
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          <section className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
            <h2 className="border-b border-[var(--afc-border)] px-6 py-4 text-lg font-semibold text-[var(--afc-text)]">
              Livre de caisse
            </h2>
            <p className="border-b border-[rgba(var(--afc-hl),0.04)] px-6 py-2 text-sm text-[var(--afc-muted)]">
              Historique unifié : cotisations, allocations vers sous-caisses, dépenses et retraits.
            </p>
            <div className="max-h-[420px] overflow-x-auto overflow-y-auto">
              <table className="afc-table-dark w-full text-left">
                <thead className="sticky top-0 bg-[var(--afc-card)]">
                  <tr>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Type</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Libellé / Bénéficiaire</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {livre.map((entry) => (
                    <tr key={`${entry.type}-${entry.id}`} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--afc-muted-2)]">
                        {new Date(entry.date).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.type === 'entree' ? 'border border-emerald-700/30 bg-emerald-900/20 text-emerald-400' : 'border border-red-700/30 bg-red-900/20 text-red-400'}`}>
                          {entry.type === 'entree' ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[var(--afc-text)]">
                        {entry.type === 'entree' ? (
                          <>
                            {entry.label}
                            {entry.periodYear != null && entry.periodMonth != null && (
                              <span className="ml-1 text-sm text-[var(--afc-muted)]">
                                ({new Date(entry.periodYear, entry.periodMonth - 1).toLocaleString('fr-FR', {
                                  month: 'long',
                                  year: 'numeric',
                                })})
                              </span>
                            )}
                            {entry.kind === 'allocation' && entry.description && (
                              <span className="mt-0.5 block text-sm text-[var(--afc-muted-2)]">{entry.description}</span>
                            )}
                          </>
                        ) : (
                          <>
                            {entry.label ?? entry.description ?? '—'}
                            {entry.beneficiary && (
                              <span className="mt-0.5 block text-sm text-[var(--afc-muted-2)]">Bénéficiaire : {entry.beneficiary}</span>
                            )}
                            {entry.kind === 'withdrawal' && entry.description && (
                              <span className="mt-0.5 block text-sm text-[var(--afc-muted-2)]">{entry.description}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className={`px-6 py-3 font-medium ${entry.type === 'entree' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.type === 'entree' ? '+' : '−'}
                        {entry.amount.toLocaleString('fr-FR')} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {livre.length === 0 && (
              <div className="py-8 text-center text-sm text-[var(--afc-muted)]">Aucun mouvement enregistré.</div>
            )}
            {livre.length > 0 && livre.length >= livreLimit && (
              <div className="border-t border-[var(--afc-border)] px-6 py-3 text-center">
                <button type="button" onClick={() => setLivreLimit((n) => n + 100)} className="text-sm font-medium text-[#C9A048] transition hover:text-[#DDB65C] hover:underline">
                  Charger plus de mouvements
                </button>
              </div>
            )}
          </section>
        </>
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

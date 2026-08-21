'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { regularizationsApi, type Member, type RegularizationAgreement } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Candidate = Member & {
  debt: { totalOwed: number; monthlyAmount: number; unpaidMonths: Array<{ year: number; month: number; amount: number; label: string }>; monthlyContributionId: string };
};

export default function RegularisationsAdminPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [agreements, setAgreements] = useState<RegularizationAgreement[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<'INSTALLMENT' | 'SETTLEMENT'>('INSTALLMENT');
  const [agreedAmount, setAgreedAmount] = useState(0);
  const [initialAmount, setInitialAmount] = useState(0);
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => candidates.find((c) => c.id === selectedId), [candidates, selectedId]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [candidateRows, agreementRows] = await Promise.all([regularizationsApi.candidates(), regularizationsApi.list()]);
      setCandidates(candidateRows);
      setAgreements(agreementRows);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user?.role === 'ADMIN') void load(); }, [user?.role, load]);
  useEffect(() => {
    if (!selected) return;
    setAgreedAmount(selected.debt.totalOwed);
    setInitialAmount(mode === 'SETTLEMENT' ? selected.debt.totalOwed : Math.min(selected.debt.monthlyAmount * 2, selected.debt.totalOwed));
  }, [selected, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await regularizationsApi.create({
        memberId: selected.id,
        mode,
        agreedAmount,
        initialAmount: mode === 'SETTLEMENT' ? agreedAmount : initialAmount,
        deadline: mode === 'INSTALLMENT' ? new Date(`${deadline}T23:59:59`).toISOString() : undefined,
        notes: notes || undefined,
      });
      setMessage('Accord créé. Le membre peut maintenant payer le montant défini depuis sa page de régularisation.');
      setSelectedId(''); setNotes(''); setDeadline('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Création impossible'); }
    finally { setSaving(false); }
  }

  if (user && user.role !== 'ADMIN') return <div className="card">Accès réservé à l’administrateur.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Régularisations</h1>
        <p className="text-gray-600 mt-1">Accords nominatifs pour les membres ayant au moins quatre mois impayés.</p>
      </div>
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {message && <div className="rounded-xl bg-green-50 px-4 py-3 text-green-800">{message}</div>}

      <form onSubmit={submit} className="card space-y-4">
        <h2 className="text-lg font-semibold">Créer un accord</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Membre concerné</label>
          <select className="input w-full" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required>
            <option value="">Sélectionner un membre</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.debt.unpaidMonths.length} mois — {c.debt.totalOwed.toLocaleString('fr-FR')} FCFA</option>)}
          </select>
        </div>
        {selected && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Dette constatée : <strong>{selected.debt.totalOwed.toLocaleString('fr-FR')} FCFA</strong> pour {selected.debt.unpaidMonths.map((m) => m.label).join(', ')}.</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="block text-sm font-medium mb-1">Type d’accord</label><select className="input w-full" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="INSTALLMENT">Paiement par tranches</option><option value="SETTLEMENT">Règlement négocié en une fois</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Montant final négocié (FCFA)</label><input className="input w-full" type="number" min="100" max={selected?.debt.totalOwed} value={agreedAmount || ''} onChange={(e) => setAgreedAmount(Number(e.target.value))} required /></div>
          {mode === 'INSTALLMENT' && <><div><label className="block text-sm font-medium mb-1">Première tranche (FCFA)</label><input className="input w-full" type="number" min="100" max={agreedAmount} value={initialAmount || ''} onChange={(e) => setInitialAmount(Number(e.target.value))} required /></div><div><label className="block text-sm font-medium mb-1">Date limite pour le solde</label><input className="input w-full" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required /></div></>}
        </div>
        {selected && agreedAmount > 0 && <p className="text-sm text-green-700">Remise accordée : <strong>{Math.max(0, selected.debt.totalOwed - agreedAmount).toLocaleString('fr-FR')} FCFA</strong></p>}
        <div><label className="block text-sm font-medium mb-1">Note interne / conditions</label><textarea className="input w-full min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <button className="btn-primary" disabled={!selected || saving}>{saving ? 'Création…' : 'Créer l’accord'}</button>
      </form>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Historique des accords</h2>
        {loading ? <p>Chargement…</p> : agreements.length === 0 ? <p className="text-gray-500">Aucun accord enregistré.</p> : <div className="space-y-3">{agreements.map((a) => <div key={a.id} className="rounded-xl border border-gray-200 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{a.member?.firstName} {a.member?.lastName}</strong><span>{a.status}</span></div><p className="text-gray-600 mt-1">Dette {a.originalAmount.toLocaleString('fr-FR')} · Accord {a.agreedAmount.toLocaleString('fr-FR')} · Payé {a.paidAmount.toLocaleString('fr-FR')} · Solde {a.balance.toLocaleString('fr-FR')} FCFA</p>{a.deadline && <p className="text-gray-500">Échéance : {new Date(a.deadline).toLocaleDateString('fr-FR')}</p>}</div>)}</div>}
      </div>
    </div>
  );
}

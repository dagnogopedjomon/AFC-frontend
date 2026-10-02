'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { regularizationsApi, type Member, type RegularizationAgreement } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Candidate = Member & {
  eligibleForAgreement: boolean;
  debt: { totalOwed: number; monthlyAmount: number; unpaidMonths: Array<{ year: number; month: number; amount: number; label: string }>; monthlyContributionId: string };
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente de paiement', PARTIALLY_PAID: 'Partiellement payé', COMPLETED: 'Terminé', OVERDUE: 'En retard', CANCELLED: 'Annulé',
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
  const [editing, setEditing] = useState<RegularizationAgreement | null>(null);
  const [editAgreed, setEditAgreed] = useState(0);
  const [editInitial, setEditInitial] = useState(0);
  const [editDeadline, setEditDeadline] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const activeByMember = useMemo(() => {
    const map = new Map<string, RegularizationAgreement>();
    for (const a of agreements) if (['PENDING', 'PARTIALLY_PAID', 'OVERDUE'].includes(a.status)) map.set(a.memberId, a);
    return map;
  }, [agreements]);

  function startEdit(a: RegularizationAgreement) {
    setEditing(a);
    setEditAgreed(a.agreedAmount);
    setEditInitial(a.initialAmount);
    setEditDeadline(a.deadline ? a.deadline.slice(0, 10) : '');
    setEditNotes(a.notes ?? '');
    setError(null); setMessage(null);
    setTimeout(() => document.getElementById('edit-agreement')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const deadlineChanged = editDeadline && editDeadline !== (editing.deadline ?? '').slice(0, 10);
      await regularizationsApi.update(editing.id, {
        agreedAmount: editAgreed,
        ...(editing.mode === 'INSTALLMENT' && editing.paidAmount === 0 && { initialAmount: editInitial }),
        ...(deadlineChanged && { deadline: new Date(`${editDeadline}T23:59:59`).toISOString() }),
        notes: editNotes,
      });
      setMessage('Accord modifié. Le membre en a été notifié.');
      setEditing(null);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Modification impossible'); }
    finally { setSaving(false); }
  }

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

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-6 text-[var(--afc-muted)]">
        Accès réservé à l&rsquo;administrateur.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Régularisations</h1>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Consultez les dettes de chaque membre et créez un accord à partir de quatre mois impayés.</p>
      </header>

      {error && <div className="afc-badge-red rounded-xl border px-4 py-3">{error}</div>}
      {message && <div className="afc-badge-emerald rounded-xl border px-4 py-3">{message}</div>}

      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--afc-text)]">Membres en retard</h2>
          <span className="text-sm text-[var(--afc-muted)]">{candidates.length} membre{candidates.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? <p className="text-[var(--afc-muted)]">Chargement…</p> : candidates.length === 0 ? <p className="text-[var(--afc-muted)]">Tous les membres sont à jour.</p> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => {
                  const active = activeByMember.get(candidate.id);
                  if (active) startEdit(active);
                  else if (candidate.eligibleForAgreement) setSelectedId(candidate.id);
                }}
                className={`rounded-xl border p-4 text-left transition ${candidate.eligibleForAgreement || activeByMember.has(candidate.id) ? 'afc-badge-amber cursor-pointer hover:opacity-90' : 'cursor-default border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--afc-text)]">{candidate.firstName} {candidate.lastName}</p>
                    <p className="text-xs text-[var(--afc-muted)]">{candidate.phone}</p>
                  </div>
                  <span className="whitespace-nowrap font-bold text-amber-400">{candidate.debt.totalOwed.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <p className="mt-2 text-sm text-[var(--afc-muted-2)]"><strong className="text-[var(--afc-text-soft)]">{candidate.debt.unpaidMonths.length} mois :</strong> {candidate.debt.unpaidMonths.map((month) => month.label).join(', ')}</p>
                <p className="mt-2 text-xs font-medium text-[var(--afc-muted)]">{activeByMember.has(candidate.id) ? 'Accord en cours : cliquer pour le modifier' : candidate.eligibleForAgreement ? 'Cliquer pour préparer un accord de régularisation' : 'Accord disponible à partir de 4 mois impayés'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <h2 className="text-lg font-semibold text-[var(--afc-text)]">Créer un accord</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Membre concerné</label>
          <select className="afc-login-input w-full text-sm" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required>
            <option value="">Sélectionner un membre</option>
            {candidates.map((c) => <option key={c.id} value={c.id} disabled={!c.eligibleForAgreement || activeByMember.has(c.id)}>{c.firstName} {c.lastName} — {c.debt.unpaidMonths.length} mois — {c.debt.totalOwed.toLocaleString('fr-FR')} FCFA{activeByMember.has(c.id) ? ' (accord en cours)' : !c.eligibleForAgreement ? ' (moins de 4 mois)' : ''}</option>)}
          </select>
        </div>
        {selected && <div className="afc-badge-amber rounded-xl border p-3 text-sm">Dette constatée : <strong>{selected.debt.totalOwed.toLocaleString('fr-FR')} FCFA</strong> pour {selected.debt.unpaidMonths.map((m) => m.label).join(', ')}.</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Type d&rsquo;accord</label>
            <select className="afc-login-input w-full text-sm" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="INSTALLMENT">Paiement par tranches</option>
              <option value="SETTLEMENT">Règlement négocié en une fois</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Montant final négocié (FCFA)</label>
            <input className="afc-login-input w-full text-sm" type="number" min="100" max={selected?.debt.totalOwed} value={agreedAmount || ''} onChange={(e) => setAgreedAmount(Number(e.target.value))} required />
          </div>
          {mode === 'INSTALLMENT' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Première tranche (FCFA)</label>
                <input className="afc-login-input w-full text-sm" type="number" min="100" max={agreedAmount} value={initialAmount || ''} onChange={(e) => setInitialAmount(Number(e.target.value))} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Date limite pour le solde</label>
                <input className="afc-login-input w-full text-sm" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
              </div>
            </>
          )}
        </div>
        {selected && agreedAmount > 0 && <p className="text-sm text-emerald-400">Remise accordée : <strong>{Math.max(0, selected.debt.totalOwed - agreedAmount).toLocaleString('fr-FR')} FCFA</strong></p>}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Note interne / conditions</label>
          <textarea className="afc-login-input min-h-20 w-full text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button className="afc-button-primary disabled:opacity-60" disabled={!selected || saving}>{saving ? 'Création…' : 'Créer l’accord'}</button>
      </form>

      {editing && (
        <form id="edit-agreement" onSubmit={submitEdit} className="space-y-4 rounded-xl border border-[#C9A048]/40 bg-[var(--afc-card)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--afc-text)]">Modifier l&rsquo;accord de {editing.member?.firstName} {editing.member?.lastName}</h2>
            <span className="afc-badge-blue rounded-full border px-3 py-1 text-xs font-semibold">{editing.mode === 'INSTALLMENT' ? 'Paiement par tranches' : 'Règlement négocié'}</span>
          </div>
          <p className="text-sm text-[var(--afc-muted)]">Dette initiale {editing.originalAmount.toLocaleString('fr-FR')} FCFA · déjà payé {editing.paidAmount.toLocaleString('fr-FR')} FCFA. Le type d&rsquo;accord ne peut pas changer : pour cela, annulez puis recréez l&rsquo;accord.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Montant final négocié (FCFA)</label>
              <input className="afc-login-input w-full text-sm" type="number" min={Math.max(100, editing.paidAmount + 1)} max={editing.originalAmount} value={editAgreed || ''} onChange={(e) => setEditAgreed(Number(e.target.value))} required />
            </div>
            {editing.mode === 'INSTALLMENT' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Première tranche (FCFA)</label>
                  <input className="afc-login-input w-full text-sm disabled:opacity-60" type="number" min="100" max={editAgreed} value={editInitial || ''} onChange={(e) => setEditInitial(Number(e.target.value))} disabled={editing.paidAmount > 0} required />
                  {editing.paidAmount > 0 && <p className="mt-1 text-xs text-[var(--afc-muted)]">Déjà versée, non modifiable.</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Date limite pour le solde</label>
                  <input className="afc-login-input w-full text-sm" type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <p className="text-sm text-emerald-400">Remise accordée : <strong>{Math.max(0, editing.originalAmount - editAgreed).toLocaleString('fr-FR')} FCFA</strong> · solde à régler : <strong>{Math.max(0, editAgreed - editing.paidAmount).toLocaleString('fr-FR')} FCFA</strong></p>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Note interne / conditions</label>
            <textarea className="afc-login-input min-h-20 w-full text-sm" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="afc-button-primary disabled:opacity-60" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-[var(--afc-border)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.05)]">Annuler</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Historique des accords</h2>
        {loading ? <p className="text-[var(--afc-muted)]">Chargement…</p> : agreements.length === 0 ? <p className="text-[var(--afc-muted)]">Aucun accord enregistré.</p> : (
          <div className="space-y-3">
            {agreements.map((a) => (
              <div key={a.id} className="rounded-xl border border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="text-[var(--afc-text)]">{a.member?.firstName} {a.member?.lastName}</strong>
                  <span className="flex items-center gap-3">
                    <span className="text-[var(--afc-muted-2)]">{STATUS_LABEL[a.status] ?? a.status}</span>
                    {activeByMember.get(a.memberId)?.id === a.id && (
                      <button type="button" onClick={() => startEdit(a)} className="rounded-lg border border-[#C9A048]/50 px-3 py-1 text-xs font-semibold text-[#C9A048] transition hover:bg-[#C9A048]/10">Modifier</button>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-[var(--afc-muted-2)]">Dette {a.originalAmount.toLocaleString('fr-FR')} · Accord {a.agreedAmount.toLocaleString('fr-FR')} · Payé {a.paidAmount.toLocaleString('fr-FR')} · Solde {a.balance.toLocaleString('fr-FR')} FCFA</p>
                {a.deadline && <p className="text-[var(--afc-muted)]">Échéance : {new Date(a.deadline).toLocaleDateString('fr-FR')}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

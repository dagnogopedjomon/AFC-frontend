'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { administrationApi, membersApi, type Fine, type Member } from '@/lib/api';
import { confirmAction } from '@/lib/swal';
import { useAuth } from '@/lib/auth-context';

const reasons = ['Retard de paiement', 'Absence', 'Comportement', 'Autre'];
const statusLabel: Record<string, string> = { UNPAID: 'À régler', PAID: 'Réglée', CANCELLED: 'Annulée' };
const statusTone: Record<string, string> = {
  PAID: 'afc-badge-blue border',
  CANCELLED: 'afc-badge-gray border',
  UNPAID: 'afc-badge-amber border',
};
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const FINES_ROLES = ['ADMIN', 'TREASURER'];

export default function AmendesPage() {
  const { user } = useAuth();
  const canManage = !!user && FINES_ROLES.includes(user.role);
  const [fines, setFines] = useState<Fine[]>([]); const [members, setMembers] = useState<Member[]>([]);
  const [show, setShow] = useState(false); const [statusFilter, setStatusFilter] = useState('ALL'); const [reasonFilter, setReasonFilter] = useState('ALL'); const [memberFilter, setMemberFilter] = useState('ALL');
  const [memberId, setMemberId] = useState(''); const [reason, setReason] = useState(reasons[0]); const [amount, setAmount] = useState(0); const [note, setNote] = useState('');
  const load = () => administrationApi.fines().then(setFines).catch((e) => toast.error(e.message));
  useEffect(() => { if (canManage) { load(); membersApi.list().then(setMembers).catch(() => setMembers([])); } }, [canManage]);
  const visible = useMemo(() => fines.filter((fine) => (statusFilter === 'ALL' || fine.status === statusFilter) && (reasonFilter === 'ALL' || fine.reason === reasonFilter) && (memberFilter === 'ALL' || fine.member.id === memberFilter)), [fines, statusFilter, reasonFilter, memberFilter]);
  function openWizard() { setMemberId(''); setReason(reasons[0]); setAmount(0); setNote(''); setShow(true); }
  async function submit(event: FormEvent) { event.preventDefault(); if (!memberId || amount <= 0) return; try { await administrationApi.createFine({ memberId, reason, amount, note }); toast.success('Amende enregistrée'); setShow(false); setMemberId(''); setAmount(0); setNote(''); load(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur'); } }
  async function settleFine(id: string) { const confirmation = await confirmAction('Marquer cette amende comme réglée ?', 'Le règlement sera enregistré dans la caisse.'); if (!confirmation.isConfirmed) return; administrationApi.settleFine(id).then(() => { toast.success('Règlement encaissé'); load(); }).catch((error) => toast.error(error instanceof Error ? error.message : 'Erreur')); }
  async function cancelFine(id: string) { const confirmation = await confirmAction('Annuler cette amende ?', 'Cette action peut être auditée par le bureau.'); if (!confirmation.isConfirmed) return; administrationApi.cancelFine(id).then(() => { toast.success('Amende annulée'); load(); }).catch((error) => toast.error(error instanceof Error ? error.message : 'Erreur')); }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-6">
        <h1 className="mb-2 text-xl font-semibold text-[var(--afc-text)]">Amendes</h1>
        <p className="text-sm text-[var(--afc-muted)]">L&rsquo;accès à cette page est réservé à l&rsquo;Admin et au trésorier.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Amendes</h1>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Suivi des pénalités et des règlements.</p>
        </div>
        <button className="afc-button-primary w-full sm:w-auto" onClick={openWizard}>
          <Plus size={15} strokeWidth={2} aria-hidden="true" /> Nouvelle amende
        </button>
      </header>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="fine-title">
          <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[rgba(var(--afc-hl),0.08)] bg-[var(--afc-card)] shadow-2xl">
            <div className="flex items-start justify-between px-7 py-6">
              <div>
                <h2 id="fine-title" className="text-3xl font-light text-[var(--afc-text)]">Nouvelle amende</h2>
                <p className="mt-2 text-sm text-[var(--afc-muted)]">Créer une obligation de paiement pour un membre.</p>
              </div>
              <button type="button" onClick={() => setShow(false)} aria-label="Fermer" className="rounded-lg p-2 text-[var(--afc-muted)] transition hover:bg-[rgba(var(--afc-hl),0.06)] hover:text-[var(--afc-text)]"><X size={22}/></button>
            </div>
            <div className="space-y-5 px-7 pb-7">
              <label className="block text-sm font-semibold text-[var(--afc-text-soft)]">
                Membre
                <select required className="afc-login-input mt-2 w-full text-sm" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                  <option value="">Sélectionner un membre…</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName} — {m.phone}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-[var(--afc-text-soft)]">
                Motif
                <select className="afc-login-input mt-2 w-full text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {reasons.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-[var(--afc-text-soft)]">
                Montant (F CFA)
                <input required min="1" type="number" className="afc-login-input mt-2 w-full text-sm" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0" />
              </label>
              <label className="block text-sm font-semibold text-[var(--afc-text-soft)]">
                Note <span className="font-normal text-[var(--afc-muted)]">(facultative)</span>
                <textarea className="afc-login-input mt-2 min-h-24 w-full text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter un détail si nécessaire…" />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] px-7 py-5">
              <button type="button" onClick={() => setShow(false)} className="rounded-xl border border-[rgba(var(--afc-hl),0.1)] bg-[rgba(var(--afc-hl),0.03)] px-5 py-2.5 font-semibold text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]">Annuler</button>
              <button type="submit" disabled={!memberId || amount <= 0} className="afc-button-primary !rounded-xl disabled:opacity-50">Créer l&apos;amende</button>
            </div>
          </form>
        </div>
      )}

      <section className="flex flex-wrap gap-2 rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-4">
        <select aria-label="Filtrer par statut" className="afc-login-input w-full !py-2 text-sm sm:w-auto sm:min-w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">Tous les statuts</option>
          <option value="UNPAID">À régler</option>
          <option value="PAID">Réglées</option>
          <option value="CANCELLED">Annulées</option>
        </select>
        <select aria-label="Filtrer par motif" className="afc-login-input w-full !py-2 text-sm sm:w-auto sm:min-w-44" value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
          <option value="ALL">Tous les motifs</option>
          {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select aria-label="Filtrer par membre" className="afc-login-input w-full !py-2 text-sm sm:w-auto sm:min-w-52" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
          <option value="ALL">Sélectionner un membre…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
        </select>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <div className="space-y-3 p-3 md:hidden">
          {visible.map((fine) => (
            <article key={fine.id} className="rounded-xl border border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--afc-muted)]">{date(fine.createdAt)}</p>
                  <p className="mt-1 font-semibold text-[var(--afc-text)]">{fine.member.firstName} {fine.member.lastName}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[fine.status]}`}>{statusLabel[fine.status]}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--afc-border)] pt-3">
                <span className="text-sm text-[var(--afc-muted)]">{fine.reason}</span>
                <strong className="text-[var(--afc-text)]">{Number(fine.amount).toLocaleString('fr-FR')} F</strong>
              </div>
              {fine.status === 'UNPAID' && (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => settleFine(fine.id)} className="flex-1 rounded-lg border border-emerald-700/30 bg-emerald-900/20 px-3 py-2 text-sm font-semibold text-emerald-400">Régler</button>
                  <button type="button" onClick={() => cancelFine(fine.id)} className="flex-1 rounded-lg border border-red-700/30 bg-red-900/20 px-3 py-2 text-sm font-semibold text-red-400">Annuler</button>
                </div>
              )}
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="afc-table-dark w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr>
                {['Date','Membre','Motif','Montant','Réglée le','Statut','Actions'].map((col, i) => (
                  <th key={col} className={`px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]${i === 6 ? ' text-right' : ''}`}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((fine) => (
                <tr key={fine.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                  <td className="px-5 py-3.5 text-[var(--afc-muted-2)]">{date(fine.createdAt)}</td>
                  <td className="px-5 py-3.5 font-medium text-[var(--afc-text)]">{fine.member.firstName} {fine.member.lastName}</td>
                  <td className="px-5 py-3.5 text-[var(--afc-muted-2)]">{fine.reason}</td>
                  <td className="px-5 py-3.5 font-medium text-[var(--afc-text)]">{Number(fine.amount).toLocaleString('fr-FR')} F</td>
                  <td className="px-5 py-3.5 text-[var(--afc-muted-2)]">{date(fine.paidAt)}</td>
                  <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[fine.status]}`}>{statusLabel[fine.status]}</span></td>
                  <td className="px-5 py-3.5 text-right">
                    {fine.status === 'UNPAID' ? (
                      <span className="inline-flex gap-3">
                        <button title="Marquer comme réglée" className="font-medium text-emerald-400 transition hover:text-emerald-300 hover:underline" onClick={() => settleFine(fine.id)}>Régler</button>
                        <button title="Annuler cette amende" className="font-medium text-red-400 transition hover:text-red-300 hover:underline" onClick={() => cancelFine(fine.id)}>Annuler</button>
                      </span>
                    ) : <span className="text-[var(--afc-muted-3)]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && <p className="p-10 text-center text-[var(--afc-muted)]">Aucune amende.</p>}
      </section>
    </div>
  );
}

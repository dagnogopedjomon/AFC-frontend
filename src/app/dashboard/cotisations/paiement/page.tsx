'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { contributionsApi, membersApi, type Contribution, type Member } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function PaiementPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [memberId, setMemberId] = useState('');
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    Promise.all([membersApi.list(), contributionsApi.monthly()]).then(([rows, contribution]) => {
      setMembers(rows.filter((member) => member.role !== 'ADMIN'));
      setMonthly(contribution);
    }).catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible'));
  }, [user?.role]);

  const amount = useMemo(() => Number(monthly?.amount ?? 0) * months, [monthly?.amount, months]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null); setSuccess(null);
    try {
      const result = await contributionsApi.recordExternalAdvance({ memberId, months, amount, paymentMethod: method || undefined, reference: reference || undefined, note: note || undefined });
      const last = result.paidThrough;
      setSuccess(`Paiement enregistré. Le membre est payé jusqu’en ${new Date(last.year, last.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}.`);
      setReference(''); setNote('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible'); }
    finally { setSaving(false); }
  }

  if (user && user.role !== 'ADMIN') return <div className="card">Accès réservé à l’administrateur.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div><Link href="/dashboard/cotisations" className="font-medium text-[var(--sky-blue-dark)] hover:underline">← Cotisations</Link><h1 className="mt-2 text-2xl font-bold">Paiement déjà reçu</h1><p className="mt-1 text-gray-600">Enregistrez rapidement un paiement encaissé hors de l’application.</p></div>
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-green-800"><CheckCircle2 size={19} />{success}</div>}
      <form onSubmit={submit} className="card space-y-5">
        <div><label className="mb-1 block text-sm font-medium">Membre</label><select className="input w-full" value={memberId} onChange={(e) => setMemberId(e.target.value)} required><option value="">Sélectionner</option>{members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName} — {member.phone}</option>)}</select></div>
        <div><label className="mb-2 block text-sm font-medium">Durée couverte</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[1, 3, 6, 12].map((value) => <button key={value} type="button" onClick={() => setMonths(value)} className={`rounded-xl border px-3 py-2 font-semibold ${months === value ? 'border-[var(--sky-blue)] bg-[var(--sky-blue-soft)] text-[var(--sky-blue-dark)]' : 'border-gray-200'}`}>{value === 12 ? '1 an' : `${value} mois`}</button>)}</div></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-gray-500">Montant calculé automatiquement</p><p className="text-3xl font-bold text-[var(--foreground)]">{amount.toLocaleString('fr-FR')} FCFA</p><p className="text-xs text-gray-500">{months} × {Number(monthly?.amount ?? 0).toLocaleString('fr-FR')} FCFA</p></div>
        <details className="rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer text-sm font-semibold text-gray-700">Informations facultatives</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm">Moyen de paiement</label><input className="input" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Espèces, Wave externe…" /></div><div><label className="mb-1 block text-sm">Référence</label><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></div><div className="sm:col-span-2"><label className="mb-1 block text-sm">Note</label><textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} /></div></div></details>
        <button type="submit" disabled={!memberId || !monthly || saving} className="btn-primary w-full disabled:opacity-60">{saving ? 'Enregistrement…' : `Valider ${amount.toLocaleString('fr-FR')} FCFA hors application`}</button>
        <p className="text-center text-xs text-gray-500">La date, la caisse principale et la provenance « Hors application » sont enregistrées automatiquement.</p>
      </form>
    </div>
  );
}

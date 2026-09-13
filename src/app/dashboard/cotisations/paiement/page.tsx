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
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [memberId, setMemberId] = useState('');
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewPeriods, setPreviewPeriods] = useState<Array<{ year: number; month: number }>>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [linkContributionId, setLinkContributionId] = useState('');
  const [linkAmount, setLinkAmount] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    Promise.all([membersApi.list(), contributionsApi.monthly(), contributionsApi.list()]).then(([rows, contribution, allContributions]) => {
      setMembers(rows.filter((member) => member.role !== 'ADMIN'));
      setMonthly(contribution);
      setContributions(allContributions.filter((item) => item.status === 'OPEN'));
      setLinkContributionId(contribution.id);
      setLinkAmount(contribution.amount ? String(contribution.amount) : '');
      setLinkTitle(contribution.name);
    }).catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible'));
  }, [user?.role]);

  const selectedLinkContribution = contributions.find((item) => item.id === linkContributionId);

  async function createPaymentLink(event: React.FormEvent) {
    event.preventDefault();
    const amountValue = Number(linkAmount);
    if (!linkContributionId || !Number.isFinite(amountValue) || amountValue < 100) {
      setError('Choisissez une cotisation et un montant d’au moins 100 FCFA.');
      return;
    }
    setLinkLoading(true); setError(null); setGeneratedLink('');
    try {
      const result = await contributionsApi.jekoLink({
        contributionId: linkContributionId,
        memberId: memberId || undefined,
        amount: amountValue,
        title: linkTitle.trim() || selectedLinkContribution?.name || 'Versement AFC',
      });
      setGeneratedLink(result.link);
    } catch (e) { setError(e instanceof Error ? e.message : 'Création du lien impossible'); }
    finally { setLinkLoading(false); }
  }

  const amount = useMemo(() => Number(monthly?.amount ?? 0) * months, [monthly?.amount, months]);

  useEffect(() => {
    if (!memberId) { setPreviewPeriods([]); return; }
    setPreviewLoading(true);
    contributionsApi.memberHistory(memberId).then((history) => {
      const paid = new Set(history.byMonth.map((period) => `${period.year}-${period.month}`));
      const periods: Array<{ year: number; month: number }> = [];
      const cursor = new Date();
      cursor.setDate(1);
      for (let index = 0; periods.length < months && index < 36; index++) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;
        if (!paid.has(`${year}-${month}`)) periods.push({ year, month });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      setPreviewPeriods(periods);
    }).catch(() => setPreviewPeriods([])).finally(() => setPreviewLoading(false));
  }, [memberId, months]);

  const periodLabel = (period: { year: number; month: number }) =>
    new Date(period.year, period.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (previewPeriods.length !== months) { setError('Impossible de vérifier toutes les périodes avant validation.'); return; }
    const selectedMember = members.find((member) => member.id === memberId);
    const firstPeriod = periodLabel(previewPeriods[0]);
    const lastPeriod = periodLabel(previewPeriods[previewPeriods.length - 1]);
    const confirmed = window.confirm(
      `Confirmer le paiement hors application ?\n\nMembre : ${selectedMember?.firstName ?? ''} ${selectedMember?.lastName ?? ''}\nMontant : ${amount.toLocaleString('fr-FR')} FCFA\nPériode : ${firstPeriod}${months > 1 ? ` à ${lastPeriod}` : ''}\n\nCette opération ajoutera une entrée dans la caisse.`,
    );
    if (!confirmed) return;
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
      <section className="card border-l-4 border-l-emerald-500 space-y-4">
        <div><h2 className="text-lg font-semibold text-slate-900">Créer un lien de versement</h2><p className="mt-1 text-sm text-slate-500">Envoyez un lien unique pour une cotisation, un don ou un autre motif.</p></div>
        <form onSubmit={createPaymentLink} className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-medium">Motif</span><select className="input w-full" value={linkContributionId} onChange={(e) => { const next = contributions.find((item) => item.id === e.target.value); setLinkContributionId(e.target.value); setLinkAmount(next?.amount ? String(next.amount) : ''); setLinkTitle(next?.name ?? ''); }} required><option value="">Sélectionner un motif</option>{contributions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">Membre concerné</span><select className="input w-full" value={memberId} onChange={(e) => setMemberId(e.target.value)} required><option value="">Sélectionner le membre</option>{members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">Montant (FCFA)</span><input className="input w-full" type="number" min={100} value={linkAmount} onChange={(e) => setLinkAmount(e.target.value)} required /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">Titre du lien</span><input className="input w-full" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Versement AFC" /></label>
          <button type="submit" disabled={linkLoading} className="btn-primary sm:col-span-2 disabled:opacity-60">{linkLoading ? 'Création…' : 'Générer le lien'}</button>
        </form>
        {generatedLink && <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center"><input readOnly value={generatedLink} className="min-w-0 flex-1 rounded-lg border-0 bg-transparent text-sm text-emerald-900 outline-none"/><button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => navigator.clipboard?.writeText(generatedLink)}>Copier le lien</button></div>}
      </section>
      <form onSubmit={submit} className="card space-y-5">
        <div><label className="mb-1 block text-sm font-medium">Membre</label><select className="input w-full" value={memberId} onChange={(e) => setMemberId(e.target.value)} required><option value="">Sélectionner</option>{members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName} — {member.phone}</option>)}</select></div>
        <div><label className="mb-2 block text-sm font-medium">Durée couverte</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[1, 3, 6, 12].map((value) => <button key={value} type="button" onClick={() => setMonths(value)} className={`rounded-xl border px-3 py-2 font-semibold ${months === value ? 'border-[var(--sky-blue)] bg-[var(--sky-blue-soft)] text-[var(--sky-blue-dark)]' : 'border-gray-200'}`}>{value === 12 ? '1 an' : `${value} mois`}</button>)}</div></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-gray-500">Montant calculé automatiquement</p><p className="text-3xl font-bold text-[var(--foreground)]">{amount.toLocaleString('fr-FR')} FCFA</p><p className="text-xs text-gray-500">{months} × {Number(monthly?.amount ?? 0).toLocaleString('fr-FR')} FCFA</p></div>
        {memberId && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Période qui sera enregistrée</p><p className="mt-1 text-sm text-amber-800">{previewLoading ? 'Vérification…' : previewPeriods.length === months ? `${periodLabel(previewPeriods[0])}${months > 1 ? ` à ${periodLabel(previewPeriods[previewPeriods.length - 1])}` : ''}` : 'Période impossible à déterminer'}</p><p className="mt-1 text-xs text-amber-700">Vérifiez cette période avant de valider. Les mois déjà payés sont automatiquement ignorés.</p></div>}
        <details className="rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer text-sm font-semibold text-gray-700">Informations facultatives</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm">Moyen de paiement</label><input className="input" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Espèces, Wave externe…" /></div><div><label className="mb-1 block text-sm">Référence</label><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></div><div className="sm:col-span-2"><label className="mb-1 block text-sm">Note</label><textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} /></div></div></details>
        <button type="submit" disabled={!memberId || !monthly || saving || previewLoading || previewPeriods.length !== months} className="btn-primary w-full disabled:opacity-60">{saving ? 'Enregistrement…' : `Valider ${amount.toLocaleString('fr-FR')} FCFA hors application`}</button>
        <p className="text-center text-xs text-gray-500">La date, la caisse principale et la provenance « Hors application » sont enregistrées automatiquement.</p>
      </form>
    </div>
  );
}

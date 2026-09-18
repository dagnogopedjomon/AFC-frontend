'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, membersApi, type Contribution, type Member, type Payment } from '@/lib/api';
import { toast } from 'sonner';
import { Download, Loader2, Plus, Search } from 'lucide-react';
import { JekoPayButton } from '@/components/JekoPayButton';

export default function CotisationsExceptionnellesPage() {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentQuery, setPaymentQuery] = useState('');
  const [paymentContributionId, setPaymentContributionId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [canAct, setCanAct] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    amount: '',
    isOpenAmount: false,
    deadline: '',
    targetMemberIds: [] as string[],
    beneficiaryMemberId: '',
  });

  useEffect(() => {
    if (!user) return;
    setCanAct(user.role === 'ADMIN' || user.role === 'TREASURER');
    load();
    Promise.all([membersApi.list(), contributionsApi.payments({ limit: 500 })])
      .then(([memberRows, paymentRows]) => {
        setMembers(memberRows);
        setPayments(paymentRows.filter((payment) => payment.contribution?.type === 'EXCEPTIONAL'));
      })
      .catch(() => { setMembers([]); setPayments([]); });
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const list = await contributionsApi.exceptional();
      setContributions(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSubmitting(true);
    try {
      await contributionsApi.create({
        name: form.name,
        type: 'EXCEPTIONAL',
        amount: form.amount ? Number(form.amount) : undefined,
        isOpenAmount: form.isOpenAmount,
        deadline: form.deadline || undefined,
        targetMemberIds: form.targetMemberIds.length > 0 ? form.targetMemberIds : undefined,
        beneficiaryMemberId: form.beneficiaryMemberId || undefined,
      });
      toast.success('Cotisation exceptionnelle créée.');
      setShowForm(false);
      setForm({ name: '', amount: '', isOpenAmount: false, deadline: '', targetMemberIds: [], beneficiaryMemberId: '' });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleMember(id: string) {
    setForm((prev) => ({
      ...prev,
      targetMemberIds: prev.targetMemberIds.includes(id)
        ? prev.targetMemberIds.filter((m) => m !== id)
        : [...prev.targetMemberIds, id],
    }));
  }

  const visiblePayments = payments.filter((payment) => {
    if (paymentContributionId !== 'ALL' && payment.contributionId !== paymentContributionId) return false;
    const query = paymentQuery.trim().toLowerCase();
    if (!query) return true;
    return `${payment.member?.firstName ?? ''} ${payment.member?.lastName ?? ''} ${payment.member?.phone ?? ''}`.toLowerCase().includes(query);
  });
  const totalPayments = visiblePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  function exportPayments() {
    const rows = [['Date', 'Membre', 'Cotisation', 'Montant'], ...visiblePayments.map((payment) => [
      new Date(payment.paidAt).toLocaleDateString('fr-FR'),
      payment.member ? `${payment.member.firstName} ${payment.member.lastName}` : '—',
      payment.contribution?.name ?? '—',
      `${Number(payment.amount).toLocaleString('fr-FR')} FCFA`,
    ])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'journal-paiements-exceptionnels.csv'; anchor.click(); URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A048]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Cotisations exceptionnelles</h1>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Cadeaux, équipements, événements, actions surprises.</p>
        </div>
        {canAct && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className="afc-button-primary w-full sm:w-auto">
            {showForm ? 'Annuler' : <><Plus size={15} strokeWidth={2} aria-hidden="true" /> Nouvelle cotisation</>}
          </button>
        )}
      </header>

      {showForm && (
        <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Nouvelle cotisation exceptionnelle</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Nom / motif</label>
              <input
                type="text"
                className="afc-login-input w-full text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Cadeau naissance, Tournoi, Équipement..."
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Montant suggéré (FCFA)</label>
                <input
                  type="number"
                  className="afc-login-input w-full text-sm"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0 = libre"
                  disabled={form.isOpenAmount}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Date de clôture</label>
                <input
                  type="datetime-local"
                  className="afc-login-input w-full text-sm"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--afc-text-soft)]">
              <input
                type="checkbox"
                checked={form.isOpenAmount}
                onChange={(e) => setForm({ ...form, isOpenAmount: e.target.checked, amount: e.target.checked ? '' : form.amount })}
                className="h-4 w-4 accent-[#C9A048]"
              />
              Montant libre (chaque membre donne ce qu&apos;il veut)
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Bénéficiaire (optionnel)</label>
              <select
                className="afc-login-input w-full text-sm"
                value={form.beneficiaryMemberId}
                onChange={(e) => setForm({ ...form, beneficiaryMemberId: e.target.value })}
              >
                <option value="">Aucun / Ouvert à tous</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Membres concernés (laisser vide = ouvert à tous)</label>
              <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.02)] p-2">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm text-[var(--afc-text-soft)]">
                    <input
                      type="checkbox"
                      checked={form.targetMemberIds.includes(m.id)}
                      onChange={() => toggleMember(m.id)}
                      className="h-4 w-4 accent-[#C9A048]"
                    />
                    {m.firstName} {m.lastName}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={submitting} className="afc-button-primary disabled:opacity-60">
              {submitting ? 'Création…' : 'Créer la cotisation'}
            </button>
          </form>
        </div>
      )}

      {contributions.length === 0 ? (
        <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12 text-center">
          <p className="text-[var(--afc-muted)]">Aucune cotisation exceptionnelle disponible pour l&rsquo;instant.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contributions.map((c) => {
            const isClosed = c.status === 'CLOSED_DELIVERED';
            const isPending = c.status === 'CLOSED_PENDING';
            const deadline = c.deadline ? new Date(c.deadline) : null;
            return (
              <div key={c.id} className={`rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5 ${isClosed ? 'opacity-60' : ''}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[var(--afc-text)]">{c.name}</h3>
                      {isClosed && <span className="rounded-full border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.06)] px-2 py-0.5 text-xs text-[var(--afc-muted-2)]">Clôturée et remise</span>}
                      {isPending && <span className="rounded-full border border-amber-700/30 bg-amber-900/20 px-2 py-0.5 text-xs text-amber-400">Clôturée — en attente de réception</span>}
                    </div>
                    {c.amount && !c.isOpenAmount && (
                      <p className="mt-1 text-sm text-[var(--afc-muted-2)]">Montant suggéré : {Number(c.amount).toLocaleString('fr-FR')} FCFA</p>
                    )}
                    {c.isOpenAmount && (
                      <p className="mt-1 text-sm text-[var(--afc-muted-2)]">Montant libre</p>
                    )}
                    {deadline && (
                      <p className="animate-blink-red mt-1 text-sm font-medium">
                        Clôture : {deadline.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/cotisations/exceptionnelles/${c.id}`}
                      className="rounded-xl border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:border-[#C9A048]/40 hover:text-[#C9A048]"
                    >
                      Détails
                    </Link>
                  </div>
                </div>
                {!isClosed && c.status === 'OPEN' && (
                  <div className="mt-4 border-t border-[var(--afc-border)] pt-4">
                    <JekoPayButton
                      contributionId={c.id}
                      amount={c.amount ? Number(c.amount) : 1000}
                      label={c.amount ? `${Number(c.amount).toLocaleString('fr-FR')} FCFA` : 'Don libre'}
                      onError={(msg) => toast.error(msg)}
                    />
                    {c.isOpenAmount && (
                      <p className="mt-2 text-xs text-[var(--afc-muted)]">Pour un montant personnalisé, utilisez le bouton ci-dessus. Le montant final est à définir sur la page Jeko.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <div className="flex flex-col gap-4 border-b border-[var(--afc-border)] px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="text-xl font-semibold text-[var(--afc-text)]">Journal des paiements exceptionnels</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Filtrer par cotisation" className="afc-login-input !w-auto min-w-52 !py-2 text-sm" value={paymentContributionId} onChange={(e) => setPaymentContributionId(e.target.value)}>
              <option value="ALL">Toutes les cotisations</option>
              {contributions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="relative">
              <Search size={15} strokeWidth={1.6} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--afc-muted-3)]"/>
              <input aria-label="Rechercher un membre" className="afc-login-input !w-64 !py-2 !pl-9 text-sm" placeholder="Rechercher membre…" value={paymentQuery} onChange={(e) => setPaymentQuery(e.target.value)} />
            </div>
            <button type="button" onClick={exportPayments} disabled={visiblePayments.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:border-[#C9A048]/40 hover:text-[#C9A048] disabled:opacity-50"><Download size={16} strokeWidth={1.8}/> CSV</button>
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] px-6 py-3 text-sm text-[var(--afc-muted)]">
          <span>{visiblePayments.length} paiement{visiblePayments.length === 1 ? '' : 's'}</span>
          <strong className="font-mono text-[#C9A048]">Total : {totalPayments.toLocaleString('fr-FR')} F</strong>
        </div>
        <div className="overflow-x-auto">
          <table className="afc-table-dark w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Membre</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Cotisation</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
              </tr>
            </thead>
            <tbody>
              {visiblePayments.map((payment) => (
                <tr key={payment.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                  <td className="whitespace-nowrap px-6 py-3 text-[var(--afc-muted-2)]">{new Date(payment.paidAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-3 font-medium text-[var(--afc-text)]">{payment.member ? `${payment.member.firstName} ${payment.member.lastName}` : '—'}</td>
                  <td className="px-6 py-3 text-[var(--afc-muted-2)]">{payment.contribution?.name ?? '—'}</td>
                  <td className="px-6 py-3 text-right font-semibold text-emerald-400">{Number(payment.amount).toLocaleString('fr-FR')} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visiblePayments.length === 0 && <p className="py-12 text-center text-[var(--afc-muted)]">Aucun paiement ne correspond à ce filtre.</p>}
      </section>
    </div>
  );
}

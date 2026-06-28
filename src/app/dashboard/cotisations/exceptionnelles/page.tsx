'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, membersApi, type Contribution, type Member } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { JekoPayButton } from '@/components/JekoPayButton';

export default function CotisationsExceptionnellesPage() {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
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
    membersApi.list().then(setMembers).catch(() => setMembers([]));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--sky-blue)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/cotisations" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Cotisations</Link>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Cotisations exceptionnelles</h1>
          <p className="text-gray-600 mt-1">Cadeaux, équipements, événements, actions surprises.</p>
        </div>
        {canAct && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary"
          >
            {showForm ? 'Annuler' : 'Nouvelle cotisation'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Nouvelle cotisation exceptionnelle</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom / motif</label>
              <input
                type="text"
                className="input-field w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Cadeau naissance, Tournoi, Équipement..."
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant suggéré (FCFA)</label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0 = libre"
                  disabled={form.isOpenAmount}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de clôture</label>
                <input
                  type="datetime-local"
                  className="input-field w-full"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isOpenAmount}
                onChange={(e) => setForm({ ...form, isOpenAmount: e.target.checked, amount: e.target.checked ? '' : form.amount })}
                className="h-4 w-4"
              />
              Montant libre (chaque membre donne ce qu'il veut)
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bénéficiaire (optionnel)</label>
              <select
                className="input-field w-full"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Membres concernés (laisser vide = ouvert à tous)</label>
              <div className="max-h-40 overflow-auto border border-gray-200 rounded-xl p-2 space-y-1">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.targetMemberIds.includes(m.id)}
                      onChange={() => toggleMember(m.id)}
                      className="h-4 w-4"
                    />
                    {m.firstName} {m.lastName}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting ? 'Création…' : 'Créer la cotisation'}
            </button>
          </form>
        </div>
      )}

      {contributions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Aucune cotisation exceptionnelle disponible pour l'instant.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contributions.map((c) => {
            const isClosed = c.status === 'CLOSED_DELIVERED';
            const isPending = c.status === 'CLOSED_PENDING';
            const deadline = c.deadline ? new Date(c.deadline) : null;
            return (
              <div key={c.id} className={`card ${isClosed ? 'opacity-75' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">{c.name}</h3>
                      {isClosed && <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs">Clôturée et remise</span>}
                      {isPending && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">Clôturée — en attente de réception</span>}
                    </div>
                    {c.amount && !c.isOpenAmount && (
                      <p className="text-sm text-gray-600 mt-1">Montant suggéré : {Number(c.amount).toLocaleString('fr-FR')} FCFA</p>
                    )}
                    {c.isOpenAmount && (
                      <p className="text-sm text-gray-600 mt-1">Montant libre</p>
                    )}
                    {deadline && (
                      <p className="text-sm font-medium mt-1 animate-blink-red">
                        Clôture : {deadline.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/cotisations/exceptionnelles/${c.id}`}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                    >
                      Détails
                    </Link>
                  </div>
                </div>
                {!isClosed && c.status === 'OPEN' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <JekoPayButton
                      contributionId={c.id}
                      amount={c.amount ? Number(c.amount) : 1000}
                      label={c.amount ? `${Number(c.amount).toLocaleString('fr-FR')} FCFA` : 'Don libre'}
                      onError={(msg) => toast.error(msg)}
                    />
                    {c.isOpenAmount && (
                      <p className="text-xs text-gray-400 mt-2">Pour un montant personnalisé, utilisez le bouton ci-dessus. Le montant final est à définir sur la page Jeko.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  contributionsApi,
  membersApi,
  type Member,
  type Contribution,
  type CreateContributionInput,
} from '@/lib/api';

const ROLES = ['ADMIN', 'TREASURER'];
const TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuelle',
  EXCEPTIONAL: 'Exceptionnelle',
  PROJECT: 'Projet',
};
const TYPE_TONE: Record<string, string> = {
  MONTHLY: 'afc-badge-blue border',
  EXCEPTIONAL: 'afc-badge-amber border',
  PROJECT: 'afc-badge-emerald border',
};

const schemaExceptional = z.object({
  name: z.string().min(1, 'Nom requis'),
  amount: z.number().min(0).optional(),
  isOpenAmount: z.boolean().optional(),
  deadline: z.string().optional(),
  targetMemberIds: z.array(z.string()).optional(),
  beneficiaryMemberId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormExceptional = z.infer<typeof schemaExceptional>;

export default function GererCotisationsPage() {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingMonthly, setEditingMonthly] = useState<boolean>(false);

  const canAccess = user && ROLES.includes(user.role);

  const load = (): Promise<unknown> => {
    if (!canAccess) return Promise.resolve();
    return Promise.all([
      contributionsApi.list().then(setContributions).catch(() => setError('Impossible de charger les cotisations')),
      contributionsApi.monthly().then(setMonthly).catch(() => setMonthly(null)),
    ]);
  };

  useEffect(() => {
    if (!canAccess) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [canAccess]);

  if (!canAccess) {
    return (
      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-6">
        <h1 className="mb-2 text-xl font-semibold text-[var(--afc-text)]">Gérer les cotisations</h1>
        <p className="text-sm text-[var(--afc-muted)]">Réservé à l&rsquo;Admin et au Trésorier.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Gérer les cotisations</h1>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Liste des cotisations et création d&rsquo;exceptionnelles.</p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-3 text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
        </div>
      ) : (
        <>
          {monthly && (
            <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
              <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Cotisation de base (mensuelle)</h2>
              {!editingMonthly ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--afc-text)]">{monthly.name}</p>
                    <p className="mt-1 text-[var(--afc-muted-2)]">
                      {monthly.amount != null ? `${Number(monthly.amount).toLocaleString('fr-FR')} FCFA / mois` : 'Montant non défini'}
                    </p>
                    <p className="mt-1 text-sm text-[var(--afc-muted)]">
                      Les membres doivent payer au moins ce montant. Un paiement manuel (montant différent) peut être enregistré par l&apos;admin/trésorier.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingMonthly(true)}
                    className="rounded-xl border border-[#C9A048]/40 px-4 py-2 font-medium text-[#C9A048] transition hover:bg-[#C9A048]/10"
                  >
                    Modifier
                  </button>
                </div>
              ) : (
                <EditMonthlyForm
                  monthly={monthly}
                  onSuccess={() => {
                    load();
                    setEditingMonthly(false);
                    toast.success('Cotisation mensuelle mise à jour');
                  }}
                  onCancel={() => setEditingMonthly(false)}
                />
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="afc-button-primary text-sm"
            >
              <Plus size={15} strokeWidth={2} aria-hidden="true" /> Nouvelle cotisation exceptionnelle
            </button>
          </div>

          {showForm && (
            <ExceptionalForm
              onSuccess={() => {
                contributionsApi.list().then(setContributions);
                setShowForm(false);
                toast.success('Cotisation exceptionnelle créée');
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          <div className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
            <div className="p-5 pb-0">
              <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Toutes les cotisations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="afc-table-dark w-full text-left">
                <thead>
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Nom</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Type</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant / Objectif</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Période / Reçu</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Paiements</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                      <td className="px-5 py-3.5 font-medium text-[var(--afc-text)]">{c.name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_TONE[c.type] ?? 'afc-badge-gray border'}`}>
                          {TYPE_LABELS[c.type] ?? c.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--afc-muted-2)]">
                        {c.amount != null && `${Number(c.amount).toLocaleString('fr-FR')} FCFA`}
                        {c.type === 'PROJECT' && c.targetAmount != null && `${Number(c.targetAmount).toLocaleString('fr-FR')} FCFA`}
                        {c.type === 'EXCEPTIONAL' && c.amount == null && '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--afc-muted-2)]">
                        {c.type === 'EXCEPTIONAL' &&
                          c.startDate &&
                          c.endDate && (
                            <>
                              {new Date(c.endDate) < new Date() ? (
                                <span className="text-[var(--afc-muted)]">Clôturée — {new Date(c.startDate).toLocaleDateString('fr-FR')} → {new Date(c.endDate).toLocaleDateString('fr-FR')}</span>
                              ) : (
                                `${new Date(c.startDate).toLocaleDateString('fr-FR')} → ${new Date(c.endDate).toLocaleDateString('fr-FR')}`
                              )}
                            </>
                          )}
                        {c.type === 'PROJECT' &&
                          c.receivedAmount != null &&
                          `${Number(c.receivedAmount).toLocaleString('fr-FR')} / ${c.targetAmount != null ? Number(c.targetAmount).toLocaleString('fr-FR') : '—'} FCFA`}
                        {c.type === 'MONTHLY' && '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--afc-muted-2)]">{c._count?.payments ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {contributions.length === 0 && (
              <p className="py-6 text-center text-[var(--afc-muted)]">Aucune cotisation. Créez une cotisation mensuelle en base si besoin.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EditMonthlyForm({
  monthly,
  onSuccess,
  onCancel,
}: {
  monthly: Contribution;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(monthly.name);
  const [amount, setAmount] = useState(monthly.amount != null ? Number(monthly.amount) : 0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setName(monthly.name);
    setAmount(monthly.amount != null ? Number(monthly.amount) : 0);
  }, [monthly]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr('Le nom est requis.');
      return;
    }
    setSubmitting(true);
    try {
      await contributionsApi.update(monthly.id, { name: name.trim(), amount: amount >= 0 ? amount : 0 });
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {err && <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-2 text-sm text-red-400">{err}</div>}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Nom</label>
        <input
          type="text"
          className="afc-login-input w-full text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Cotisation mensuelle"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Montant (FCFA / mois)</label>
        <input
          type="number"
          min="0"
          step="1"
          className="afc-login-input w-full text-sm"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
        <p className="mt-1 text-xs text-[var(--afc-muted)]">Montant minimum exigé. Un enregistrement manuel permet un montant différent.</p>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="afc-button-primary disabled:opacity-60">
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-[rgba(var(--afc-hl),0.1)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]">
          Annuler
        </button>
      </div>
    </form>
  );
}

function ExceptionalForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormExceptional>({
    resolver: zodResolver(schemaExceptional),
    defaultValues: {
      amount: 0,
      isOpenAmount: false,
      targetMemberIds: [],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
  });

  const [members, setMembers] = useState<Member[]>([]);
  const isOpenAmount = watch('isOpenAmount');
  const targetMemberIds = watch('targetMemberIds');

  useEffect(() => {
    membersApi.list().then(setMembers).catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    if (isOpenAmount) setValue('amount', 0);
  }, [isOpenAmount, setValue]);

  function toggleMember(id: string) {
    const ids = targetMemberIds ?? [];
    setValue(
      'targetMemberIds',
      ids.includes(id) ? ids.filter((m) => m !== id) : [...ids, id],
    );
  }

  async function onSubmit(data: FormExceptional) {
    const payload: CreateContributionInput = {
      name: data.name,
      type: 'EXCEPTIONAL',
      isOpenAmount: data.isOpenAmount ?? false,
      deadline: data.deadline || undefined,
      targetMemberIds: (data.targetMemberIds ?? []).length > 0 ? data.targetMemberIds : undefined,
      beneficiaryMemberId: data.beneficiaryMemberId || undefined,
      startDate: data.startDate,
      endDate: data.endDate,
    };
    if (!payload.isOpenAmount && data.amount != null && data.amount > 0) payload.amount = data.amount;
    await contributionsApi.create(payload);
    onSuccess();
  }

  return (
    <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
      <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Nouvelle cotisation exceptionnelle</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Nom <span className="text-red-400">*</span></label>
          <input className="afc-login-input w-full text-sm" placeholder="Ex. Cadeau naissance" {...register('name')} />
          {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Montant suggéré (FCFA)</label>
            <input type="number" min="0" step="1" disabled={isOpenAmount} className="afc-login-input w-full text-sm disabled:opacity-50" {...register('amount', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Date de clôture</label>
            <input type="datetime-local" className="afc-login-input w-full text-sm" {...register('deadline')} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--afc-text-soft)]">
          <input type="checkbox" {...register('isOpenAmount')} className="h-4 w-4 accent-[#C9A048]" />
          Montant libre (chaque membre donne ce qu&apos;il veut)
        </label>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Bénéficiaire (optionnel)</label>
          <Controller
            name="beneficiaryMemberId"
            control={control}
            render={({ field }) => (
              <select className="afc-login-input w-full text-sm" {...field}>
                <option value="">Aucun / Ouvert à tous</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
            )}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Membres concernés (laisser vide = ouvert à tous)</label>
          <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.02)] p-2">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm text-[var(--afc-text-soft)]">
                <input
                  type="checkbox"
                  checked={(targetMemberIds ?? []).includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                  className="h-4 w-4 accent-[#C9A048]"
                />
                {m.firstName} {m.lastName}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Date de début</label>
            <input type="date" className="afc-login-input w-full text-sm" {...register('startDate')} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--afc-text-soft)]">Date de fin</label>
            <input type="date" className="afc-login-input w-full text-sm" {...register('endDate')} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="afc-button-primary disabled:opacity-60">
            {isSubmitting ? 'Création…' : 'Créer'}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl border border-[rgba(var(--afc-hl),0.1)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

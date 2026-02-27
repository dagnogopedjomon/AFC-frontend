'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  contributionsApi,
  type Contribution,
  type CreateContributionInput,
} from '@/lib/api';

const ROLES = ['ADMIN', 'TREASURER'];
const TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuelle',
  EXCEPTIONAL: 'Exceptionnelle',
  PROJECT: 'Projet',
};

const schemaExceptional = z.object({
  name: z.string().min(1, 'Nom requis'),
  amount: z.number().min(0).optional(),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().min(1, 'Date de fin requise'),
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
      <div className="card">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-2">Gérer les cotisations</h1>
        <p className="text-gray-600 mb-4">Réservé à l’Admin et au Trésorier.</p>
        <Link href="/dashboard/cotisations" className="text-[var(--sky-blue-dark)] hover:underline">
          ← Cotisations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cotisations" className="text-[var(--sky-blue-dark)] hover:underline font-medium">
          ← Cotisations
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Gérer les cotisations</h1>
        <p className="text-gray-600 mt-1">Liste des cotisations et création d’exceptionnelles.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="card flex justify-center py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
        </div>
      ) : (
        <>
          {monthly && (
            <div className="card border-l-4 border-l-[var(--sky-blue)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Cotisation de base (mensuelle)</h2>
              {!editingMonthly ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{monthly.name}</p>
                    <p className="text-gray-600 mt-1">
                      {monthly.amount != null ? `${Number(monthly.amount).toLocaleString('fr-FR')} FCFA / mois` : 'Montant non défini'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Les membres doivent payer au moins ce montant via CinetPay. Un paiement manuel (montant différent) peut être enregistré par l’admin/trésorier.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingMonthly(true)}
                    className="px-4 py-2 rounded-xl border border-[var(--sky-blue)] text-[var(--sky-blue-dark)] hover:bg-[var(--sky-blue-soft)] font-medium"
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
              className="btn-primary text-sm"
            >
              Nouvelle cotisation exceptionnelle
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

          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Toutes les cotisations</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-[var(--sky-blue-soft)]">
                    <th className="px-4 py-3 text-sm font-semibold text-[var(--sky-blue-dark)]">Nom</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Type</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Montant / Objectif</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Période / Reçu</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Paiements</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{c.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            c.type === 'MONTHLY'
                              ? 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'
                              : c.type === 'EXCEPTIONAL'
                                ? 'px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800'
                                : 'px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
                          }
                        >
                          {TYPE_LABELS[c.type] ?? c.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.amount != null && `${Number(c.amount).toLocaleString('fr-FR')} FCFA`}
                        {c.type === 'PROJECT' && c.targetAmount != null && `${Number(c.targetAmount).toLocaleString('fr-FR')} FCFA`}
                        {c.type === 'EXCEPTIONAL' && c.amount == null && '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {c.type === 'EXCEPTIONAL' &&
                          c.startDate &&
                          c.endDate && (
                            <>
                              {new Date(c.endDate) < new Date() ? (
                                <span className="text-slate-500">Clôturée — {new Date(c.startDate).toLocaleDateString('fr-FR')} → {new Date(c.endDate).toLocaleDateString('fr-FR')}</span>
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
                      <td className="px-4 py-3 text-gray-600">{c._count?.payments ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {contributions.length === 0 && (
              <p className="py-6 text-gray-500 text-center">Aucune cotisation. Créez une cotisation mensuelle en base si besoin.</p>
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
      {err && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-2 text-sm">{err}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
        <input
          type="text"
          className="input-field w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Cotisation mensuelle"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant (FCFA / mois)</label>
        <input
          type="number"
          min="0"
          step="1"
          className="input-field w-full"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
        <p className="text-xs text-gray-500 mt-1">Montant minimum exigé via CinetPay. Un enregistrement manuel permet un montant différent.</p>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
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
    formState: { errors, isSubmitting },
  } = useForm<FormExceptional>({
    resolver: zodResolver(schemaExceptional),
    defaultValues: {
      amount: 0,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
  });

  async function onSubmit(data: FormExceptional) {
    const payload: CreateContributionInput = {
      name: data.name,
      type: 'EXCEPTIONAL',
      startDate: data.startDate,
      endDate: data.endDate,
    };
    if (data.amount != null && data.amount > 0) payload.amount = data.amount;
    await contributionsApi.create(payload);
    onSuccess();
  }

  return (
    <div className="card border-l-4 border-l-amber-500">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Nouvelle cotisation exceptionnelle</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom <span className="text-red-500">*</span></label>
          <input className="input-field w-full" placeholder="Ex. Équipement 2025" {...register('name')} />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant suggéré (FCFA)</label>
          <input type="number" min="0" step="1" className="input-field w-full" {...register('amount', { valueAsNumber: true })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de début <span className="text-red-500">*</span></label>
            <input type="date" className="input-field w-full" {...register('startDate')} />
            {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de fin <span className="text-red-500">*</span></label>
            <input type="date" className="input-field w-full" {...register('endDate')} />
            {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
            {isSubmitting ? 'Création…' : 'Créer'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}


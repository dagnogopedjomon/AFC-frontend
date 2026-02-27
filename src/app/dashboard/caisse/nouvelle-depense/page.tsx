'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { caisseApi, type CashBox } from '@/lib/api';

const CAN_CREATE = ['ADMIN', 'TREASURER'];

const schema = z.object({
  amount: z.number().min(0.01, 'Montant requis'),
  description: z.string().min(1, 'Description requise'),
  expenseDate: z.string().min(1, 'Date requise'),
  cashBoxId: z.string().optional(),
  beneficiary: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NouvelleDepensePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<CashBox[]>([]);

  const canCreate = user && CAN_CREATE.includes(user.role);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (canCreate) caisseApi.boxes().then(setBoxes).catch(() => {});
  }, [canCreate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      description: '',
      expenseDate: today,
      cashBoxId: '',
      beneficiary: '',
    },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await caisseApi.createExpense({
        amount: data.amount,
        description: data.description,
        expenseDate: data.expenseDate,
        ...(data.cashBoxId && { cashBoxId: data.cashBoxId }),
        ...(data.beneficiary?.trim() && { beneficiary: data.beneficiary.trim() }),
      });
      router.push('/dashboard/caisse?created=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
    }
  }

  if (!canCreate) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-2">Nouvelle dépense</h1>
        <p className="text-gray-600 mb-4">
          Seuls l’Admin et le Trésorier peuvent créer une dépense. La validation se fait en 2 niveaux (Trésorier puis Commissaire).
        </p>
        <Link href="/dashboard/caisse" className="text-[var(--sky-blue-dark)] hover:underline">
          ← Retour à la caisse
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/caisse"
          className="text-[var(--sky-blue-dark)] hover:underline font-medium"
        >
          ← Caisse
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Nouvelle dépense</h1>
        <p className="text-gray-600 mt-1">
          La dépense devra être validée par le Trésorier puis par le Commissaire aux comptes.
        </p>
      </div>

      <div className="card max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
          )}

          {boxes.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sous-caisse à débiter</label>
              <select className="input-field" {...register('cashBoxId')}>
                <option value="">Caisse par défaut</option>
                {boxes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.isDefault ? ' (par défaut)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant (FCFA) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="1"
              step="1"
              className="input-field"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Objet de la dépense"
              {...register('description')}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bénéficiaire (optionnel)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex. Jean Dupont, Activité Noël, Collecte solidarité…"
              {...register('beneficiary')}
            />
            <p className="mt-1 text-xs text-gray-500">Pour qui ou pour quelle activité / collecte — visible par tous (transparence).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de la dépense <span className="text-red-500">*</span></label>
            <input type="date" className="input-field" {...register('expenseDate')} />
            {errors.expenseDate && (
              <p className="mt-1 text-sm text-red-600">{errors.expenseDate.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary disabled:opacity-60"
            >
              {isSubmitting ? 'Création…' : 'Créer la dépense'}
            </button>
            <Link
              href="/dashboard/caisse"
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition font-medium"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

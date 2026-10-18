'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { activitiesApi } from '@/lib/api';

const CAN_CREATE = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];
const TYPES = [
  { value: 'MATCH', label: 'Match' },
  { value: 'TRAINING', label: 'Entraînement' },
  { value: 'BIRTHDAY', label: 'Anniversaire' },
  { value: 'ANNOUNCEMENT', label: 'Annonce' },
  { value: 'OTHER', label: 'Autre' },
];

const schema = z.object({
  type: z.string(),
  title: z.string().min(1, 'Titre requis'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date requise'),
  endDate: z.string().optional(),
  result: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NouvelleActivitePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const canCreate = user && CAN_CREATE.includes(user.role);
  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'MATCH', date: today },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await activitiesApi.create({
        type: data.type,
        title: data.title,
        description: data.description,
        date: data.date,
        endDate: data.endDate,
        result: data.result,
      });
      window.dispatchEvent(new Event('activities-updated'));
      router.push('/dashboard/activites?created=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  if (!canCreate) {
    return (
      <div className="card">
        <h1 className="font-serif text-[22px] mb-2">Nouvelle activité</h1>
        <p className="text-[var(--afc-muted)]">Réservé au bureau.</p>
        <Link href="/dashboard/activites" className="mt-4 inline-block text-[var(--sky-blue-dark)] hover:underline">← Activités</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/activites" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Activités</Link>
      <h1 className="font-serif text-[22px] text-[var(--foreground)]">Nouvelle activité</h1>
      <div className="card max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && <div className="rounded-xl bg-[var(--afc-badge-red-bg)] text-[var(--destructive)] px-4 py-3 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-[var(--afc-text)] mb-1.5">Type <span className="text-[var(--destructive)]">*</span></label>
            <select className="input-field" {...register('type')}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--afc-text)] mb-1.5">Titre <span className="text-[var(--destructive)]">*</span></label>
            <input className="input-field" {...register('title')} />
            {errors.title && <p className="mt-1 text-sm text-[var(--destructive)]">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--afc-text)] mb-1.5">Description</label>
            <textarea rows={3} className="input-field" {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--afc-text)] mb-1.5">Date <span className="text-[var(--destructive)]">*</span></label>
              <input type="date" className="input-field" {...register('date')} />
              {errors.date && <p className="mt-1 text-sm text-[var(--destructive)]">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--afc-text)] mb-1.5">Fin</label>
              <input type="date" className="input-field" {...register('endDate')} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">Créer</button>
            <Link href="/dashboard/activites" className="px-5 py-2.5 rounded-xl border border-[var(--afc-border)] text-[var(--afc-text)] hover:bg-[var(--secondary)] font-medium">Annuler</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

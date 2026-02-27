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

const schema = z.object({
  title: z.string().min(1, 'Titre requis'),
  content: z.string().min(1, 'Contenu requis'),
});

type FormData = z.infer<typeof schema>;

export default function NouvelleAnnoncePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const canCreate = user && CAN_CREATE.includes(user.role);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await activitiesApi.createAnnouncement({ title: data.title, content: data.content });
      router.push('/dashboard/activites?announcement=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  if (!canCreate) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold mb-2">Nouvelle annonce</h1>
        <p className="text-gray-600">Réservé au bureau.</p>
        <Link href="/dashboard/activites" className="mt-4 inline-block text-[var(--sky-blue-dark)] hover:underline">← Activités</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/activites" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Activités</Link>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Nouvelle annonce</h1>
      <div className="card max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre <span className="text-red-500">*</span></label>
            <input className="input-field" {...register('title')} />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contenu <span className="text-red-500">*</span></label>
            <textarea rows={5} className="input-field" {...register('content')} />
            {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">Publier</button>
            <Link href="/dashboard/activites" className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium">Annuler</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

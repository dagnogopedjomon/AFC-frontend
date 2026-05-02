'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { membersApi } from '@/lib/api';
import { toast } from 'sonner';

const schema = z.object({
  phone: z.string().min(1, 'Le téléphone est requis'),
});

type FormData = z.infer<typeof schema>;

export default function NewMemberPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [demoLink, setDemoLink] = useState<string | null>(null);
  const [whatsappSent, setWhatsappSent] = useState<boolean | null>(null);

  const canCreate = user?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const result = await membersApi.invite({
        phone: data.phone.trim(),
      });
      if (result.whatsappSent === true) {
        toast.success('Invitation envoyée. Message WhatsApp envoyé.');
      } else if (result.whatsappError) {
        toast.warning(
          `Invitation créée mais le message WhatsApp n'a pas été envoyé : ${result.whatsappError}`,
        );
      } else {
        toast.success('Invitation envoyée.');
      }
      setWhatsappSent(result.whatsappSent ?? null);
      if (result.activationLink) {
        setDemoLink(result.activationLink);
      } else {
        router.push('/dashboard/membres?invited=1');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l’invitation');
    }
  }

  if (!canCreate) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-2">
          Inviter un membre
        </h1>
        <p className="text-gray-600 mb-4">
          Seul l’Admin peut inviter des membres (Admin ≠ Président).
        </p>
        <Link href="/dashboard/membres" className="text-[var(--sky-blue-dark)] hover:underline">
          ← Retour à la liste des membres
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/membres"
          className="text-[var(--sky-blue-dark)] hover:underline font-medium"
        >
          ← Membres
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Inviter un membre
        </h1>
        <p className="text-gray-600 mt-1">
          Saisissez le téléphone. La personne sera créée comme membre ; le rôle (Président, Trésorier, etc.) pourra être attribué après élections depuis sa fiche.
        </p>
      </div>

      <div className="card max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              className="input-field"
              {...register('phone')}
              placeholder="06 12 34 56 78"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary disabled:opacity-60"
            >
              {isSubmitting ? 'Envoi…' : 'Envoyer l’invitation'}
            </button>
            <Link
              href="/dashboard/membres"
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition font-medium"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>

      {demoLink && (
        <div className={`card max-w-xl border-2 ${whatsappSent ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`font-medium mb-2 ${whatsappSent ? 'text-green-800' : 'text-amber-800'}`}>
            {whatsappSent ? 'Invitation envoyée par WhatsApp' : 'Lien d\'activation (envoi manuel)'}
          </p>
          <p className={`text-sm mb-2 ${whatsappSent ? 'text-green-700' : 'text-amber-700'}`}>
            {whatsappSent
              ? 'Le membre a reçu un message WhatsApp avec le lien d\'activation. Vous pouvez aussi copier le lien ci-dessous :'
              : 'Le message WhatsApp n\'a pas pu être envoyé. Copiez ce lien et envoyez-le manuellement au membre :'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={demoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--sky-blue-dark)] underline break-all"
            >
              {demoLink}
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(demoLink)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 text-sm font-medium hover:bg-amber-100"
            >
              Copier
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-2">Sur la page d’activation, le membre clique sur « Envoyer le code » : il reçoit le code par WhatsApp (ou il s’affiche à l’écran si WhatsApp n’est pas configuré).</p>
          <Link
            href="/dashboard/membres"
            className="mt-4 inline-block text-[var(--sky-blue-dark)] hover:underline font-medium"
          >
            ← Retour à la liste des membres
          </Link>
        </div>
      )}
    </div>
  );
}

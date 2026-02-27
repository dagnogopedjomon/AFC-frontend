'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { membersApi, type Member, type MemberAuditLogEntry } from '@/lib/api';
import { roleLabelFr, memberRoleLabel } from '@/lib/utils';
import { ConfirmModal } from '@/components/ConfirmModal';

const BUREAU_OR_ADMIN = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

const ROLES_EDIT: { value: string; label: string }[] = [
  { value: 'PLAYER', label: 'Membre' },
  { value: 'FORMER_PLAYER', label: 'Ancien membre' },
  { value: 'SUPPORTER', label: 'Supporter' },
  { value: 'PRESIDENT', label: 'Président' },
  { value: 'SECRETARY_GENERAL', label: 'Secrétaire général' },
  { value: 'TREASURER', label: 'Trésorier' },
  { value: 'COMMISSIONER', label: 'Commissaire aux comptes' },
  { value: 'GENERAL_MEANS_MANAGER', label: 'Responsable moyens généraux' },
];

const editSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  role: z.string().min(1, 'Le rôle est requis'),
  profilePhotoUrl: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  neighborhood: z.string().optional(),
  secondaryContact: z.string().optional(),
  password: z.string().min(6, 'Min. 6 caractères').optional().or(z.literal('')),
});

type EditFormData = z.infer<typeof editSchema>;

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;
  const [member, setMember] = useState<Member | null>(null);
  const [auditLog, setAuditLog] = useState<MemberAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const canView = user && BUREAU_OR_ADMIN.includes(user.role);
  const isAdmin = user?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (!id || !canView) {
      setLoading(false);
      return;
    }
    Promise.all([
      membersApi.one(id),
      membersApi.auditLog(id).catch(() => []),
    ])
      .then(([m, log]) => {
        setMember(m);
        setAuditLog(log);
        reset({
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
          profilePhotoUrl: m.profilePhotoUrl ?? '',
          email: m.email ?? '',
          neighborhood: m.neighborhood ?? '',
          secondaryContact: m.secondaryContact ?? '',
          password: '',
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [id, canView, reset]);

  const onSubmit = async (data: EditFormData) => {
    if (!id || !isAdmin) return;
    setError(null);
    setSuccess(null);
    try {
      const updated = await membersApi.update(id, {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role,
        profilePhotoUrl: data.profilePhotoUrl?.trim() || undefined,
        email: data.email?.trim() || undefined,
        neighborhood: data.neighborhood?.trim(),
        secondaryContact: data.secondaryContact?.trim(),
        ...(data.password?.trim() ? { password: data.password } : {}),
      });
      setMember(updated);
      membersApi.auditLog(id).then(setAuditLog).catch(() => {});
      setSuccess('Profil mis à jour.');
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleDelete = () => {
    if (!id || !isAdmin) return;
    setShowDeleteModal(true);
  };

  const doDelete = () => {
    if (!id || !isAdmin) return;
    setDeleting(true);
    setError(null);
    setShowDeleteModal(false);
    membersApi
      .delete(id)
      .then(() => router.push('/dashboard/membres'))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erreur');
        setDeleting(false);
      });
  };

  const handleReactivate = () => {
    if (!id || !isAdmin || !member?.isSuspended) return;
    setShowReactivateModal(true);
  };

  const doReactivate = () => {
    if (!id || !isAdmin || !member?.isSuspended) return;
    setReactivating(true);
    setError(null);
    setShowReactivateModal(false);
    membersApi
      .update(id, { isSuspended: false })
      .then((updated) => {
        setMember(updated);
        membersApi.auditLog(id).then(setAuditLog).catch(() => {});
        setSuccess('Compte réactivé. Le membre peut se connecter et régulariser ses cotisations.');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setReactivating(false));
  };

  if (!canView) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-2">Fiche membre</h1>
        <p className="text-gray-600">L’accès à cette page est réservé à l’Admin et au bureau.</p>
        <Link href="/dashboard/membres" className="mt-4 inline-block text-[var(--sky-blue-dark)] hover:underline">
          ← Retour aux membres
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card flex justify-center py-12">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/membres" className="text-[var(--sky-blue-dark)] hover:underline font-medium">
          ← Membres
        </Link>
        <div className="card text-red-600">{error}</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/membres" className="text-[var(--sky-blue-dark)] hover:underline font-medium">
          ← Membres
        </Link>
        <div className="card">Membre introuvable.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link href="/dashboard/membres" className="text-[var(--sky-blue-dark)] hover:underline font-medium">
          ← Membres
        </Link>
        {isAdmin && !editing && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="btn-primary">
              Modifier
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>}
      {success && <div className="rounded-xl bg-green-50 text-green-800 px-4 py-3">{success}</div>}

      {editing ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Modifier le profil</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input {...register('firstName')} className="input w-full" />
              {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input {...register('lastName')} className="input w-full" />
              {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>}
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle (attribué après élections)</label>
                <select {...register('role')} className="input w-full">
                  {ROLES_EDIT.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo (URL)</label>
              <input {...register('profilePhotoUrl')} className="input w-full" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" {...register('email')} className="input w-full" />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quartier</label>
              <input {...register('neighborhood')} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact secondaire</label>
              <input {...register('secondaryContact')} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
              <input type="password" {...register('password')} className="input w-full" autoComplete="new-password" />
              {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {member.profilePhotoUrl ? (
              <img
                src={member.profilePhotoUrl.startsWith('http') ? member.profilePhotoUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${member.profilePhotoUrl}`}
                alt=""
                className="h-24 w-24 rounded-full object-cover bg-gray-100"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-[var(--sky-blue-soft)] flex items-center justify-center text-2xl font-bold text-[var(--sky-blue-dark)]">
                {member.firstName[0]}
                {member.lastName[0]}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                {member.firstName} {member.lastName}
              </h1>
              <p className="text-gray-600">
                <span className="font-medium text-[var(--foreground)]">Téléphone :</span> {member.phone}
              </p>
              <p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${member.isSuspended ? 'bg-amber-100 text-amber-800' : 'bg-[var(--sky-blue-soft)] text-[var(--sky-blue-dark)]'}`}>
                  {memberRoleLabel(member.role, !!member.isSuspended)}
                </span>
              </p>
              {member.email && (
                <p className="text-gray-600">
                  <span className="font-medium text-[var(--foreground)]">Email :</span> {member.email}
                </p>
              )}
              {member.neighborhood && (
                <p className="text-gray-600">
                  <span className="font-medium text-[var(--foreground)]">Quartier :</span> {member.neighborhood}
                </p>
              )}
              {member.secondaryContact && (
                <p className="text-gray-600">
                  <span className="font-medium text-[var(--foreground)]">Contact secondaire :</span> {member.secondaryContact}
                </p>
              )}
              <p className="text-sm text-gray-500 pt-2">
                Profil complété : {member.profileCompleted ? 'Oui' : 'Non'}
                {' · '}
                Statut : {member.isSuspended ? 'Inactif (ancien membre — ne paie pas sa cotisation)' : 'À jour'}
                {' · '}
                Membre depuis le {new Date(member.createdAt).toLocaleDateString('fr-FR')}
              </p>
              {member.isSuspended && isAdmin && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={reactivating}
                    className="cursor-pointer px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {reactivating ? 'Réactivation…' : 'Réactiver le compte'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Le membre pourra se connecter et devra régulariser ses cotisations (dette + mois en cours) pour accéder à la plateforme.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {auditLog.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Historique des actions</h2>
          <ul className="space-y-2 text-sm">
            {auditLog.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-2 py-2 border-b border-gray-50 last:border-0">
                <span className="font-medium text-[var(--foreground)]">
                  {actionLabel(entry.action)}
                </span>
                <span className="text-gray-500">
                  {new Date(entry.createdAt).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {entry.performedBy && (
                  <span className="text-gray-600">
                    par {entry.performedBy.firstName} {entry.performedBy.lastName}
                  </span>
                )}
                {entry.details && (
                  <span className="text-gray-500 truncate max-w-xs" title={entry.details}>
                    — {entry.details}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmModal
        open={showReactivateModal}
        title="Réactiver le compte"
        message="Le membre pourra se connecter et devra régulariser ses cotisations."
        confirmLabel="OK"
        cancelLabel="Annuler"
        loading={reactivating}
        onConfirm={doReactivate}
        onCancel={() => setShowReactivateModal(false)}
      />
      <ConfirmModal
        open={showDeleteModal}
        title="Supprimer le membre"
        message="Supprimer définitivement ce membre ? Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        loading={deleting}
        danger
        onConfirm={doDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    INVITED: 'Invitation envoyée',
    PROFILE_COMPLETED: 'Profil complété',
    UPDATED: 'Profil modifié',
    SUSPENDED: 'Suspendu',
    REACTIVATED: 'Réactivé',
  };
  return labels[action] ?? action;
}

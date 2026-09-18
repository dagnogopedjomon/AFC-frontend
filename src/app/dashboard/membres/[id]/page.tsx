'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { API_BASE, membersApi, type Member, type MemberAuditLogEntry } from '@/lib/api';
import { memberRoleLabel } from '@/lib/utils';
import { ConfirmModal } from '@/components/ConfirmModal';
import { confirmAction } from '@/lib/swal';

const BUREAU_OR_ADMIN = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

const ROLES_EDIT: { value: string; label: string }[] = [
  { value: 'ADMIN', label: 'Administrateur' },
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
  membershipStatus: z.enum(['PROSPECT', 'ACTIVE']),
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

  const isSelf = !!user && user.id === id;
  const canViewBureau = user && BUREAU_OR_ADMIN.includes(user.role);
  const canView = canViewBureau || isSelf;
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
      canViewBureau ? membersApi.one(id) : membersApi.me(),
      canViewBureau ? membersApi.auditLog(id).catch(() => []) : Promise.resolve([]),
    ])
      .then(([m, log]) => {
        setMember(m);
        setAuditLog(log);
        reset({
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
          membershipStatus: m.membershipStatus ?? 'ACTIVE',
          profilePhotoUrl: m.profilePhotoUrl ?? '',
          email: m.email ?? '',
          neighborhood: m.neighborhood ?? '',
          secondaryContact: m.secondaryContact ?? '',
          password: '',
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [id, canView, canViewBureau, reset]);

  const onSubmit = async (data: EditFormData) => {
    if (!id || !isAdmin) return;

    if (data.role === 'ADMIN' && member?.role !== 'ADMIN') {
      const confirmation = await confirmAction(
        'Transférer les droits d\'administrateur ?',
        `${data.firstName} ${data.lastName} deviendra le seul administrateur. Vous perdrez immédiatement vos propres droits d'administrateur et redeviendrez membre simple.`,
      );
      if (!confirmation.isConfirmed) return;
    }

    setError(null);
    setSuccess(null);
    try {
      const updated = await membersApi.update(id, {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role,
        membershipStatus: data.membershipStatus,
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

  const BackLink = () => (
    <Link href="/dashboard/membres" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--afc-muted)] transition hover:text-[var(--afc-text)]">
      <ArrowLeft size={16} strokeWidth={1.8} /> Membres
    </Link>
  );

  if (!canView) {
    return (
      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-6">
        <h1 className="mb-2 text-xl font-semibold text-[var(--afc-text)]">Fiche membre</h1>
        <p className="text-[var(--afc-muted)]">L&rsquo;accès à cette page est réservé à l&rsquo;Admin et au bureau.</p>
        <div className="mt-4"><BackLink /></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-xl border border-red-700/30 bg-red-900/20 p-5 text-red-400">{error}</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5 text-[var(--afc-muted)]">Membre introuvable.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <BackLink />
        {isAdmin && !editing && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="afc-button-primary">
              Modifier
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border border-red-700/30 bg-red-900/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-900/20 disabled:opacity-60"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-3 text-red-400">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-700/30 bg-emerald-900/20 px-4 py-3 text-emerald-400">{success}</div>}

      {editing ? (
        <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Modifier le profil</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Prénom</label>
              <input {...register('firstName')} className="afc-login-input w-full text-sm" />
              {errors.firstName && <p className="mt-1 text-sm text-red-400">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Nom</label>
              <input {...register('lastName')} className="afc-login-input w-full text-sm" />
              {errors.lastName && <p className="mt-1 text-sm text-red-400">{errors.lastName.message}</p>}
            </div>
            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Rôle (attribué après élections)</label>
                <select {...register('role')} className="afc-login-input w-full text-sm">
                  {ROLES_EDIT.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="mt-1 text-sm text-red-400">{errors.role.message}</p>}
              </div>
            )}
            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Statut d&rsquo;adhésion</label>
                <select {...register('membershipStatus')} className="afc-login-input w-full text-sm">
                  <option value="PROSPECT">Prospect (6 mois)</option>
                  <option value="ACTIVE">Membre actif</option>
                </select>
                <p className="mt-1 text-xs text-[var(--afc-muted)]">La promotion automatique intervient après six mois, sauf modification manuelle.</p>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Photo (URL)</label>
              <input {...register('profilePhotoUrl')} className="afc-login-input w-full text-sm" placeholder="https://..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Email</label>
              <input type="email" {...register('email')} className="afc-login-input w-full text-sm" />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Quartier</label>
              <input {...register('neighborhood')} className="afc-login-input w-full text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Contact secondaire</label>
              <input {...register('secondaryContact')} className="afc-login-input w-full text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
              <input type="password" {...register('password')} className="afc-login-input w-full text-sm" autoComplete="new-password" />
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={isSubmitting} className="afc-button-primary">
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-[rgba(var(--afc-hl),0.1)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]">
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {member.profilePhotoUrl ? (
              <img
                src={member.profilePhotoUrl.startsWith('http') ? member.profilePhotoUrl : `${API_BASE}${member.profilePhotoUrl}`}
                alt=""
                className="h-24 w-24 rounded-full bg-[rgba(var(--afc-hl),0.04)] object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--afc-avatar-bg)] text-2xl font-bold text-[var(--afc-avatar-text)]">
                {member.firstName[0]}
                {member.lastName[0]}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-semibold text-[var(--afc-text)]">
                {member.firstName} {member.lastName}
              </h1>
              <p className="text-[var(--afc-muted-2)]">
                <span className="font-medium text-[var(--afc-text)]">Téléphone :</span> {member.phone}
              </p>
              <p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${member.isSuspended ? 'border border-amber-700/30 bg-amber-900/20 text-amber-400' : 'border border-blue-700/30 bg-blue-900/20 text-[var(--afc-avatar-text)]'}`}>
                  {memberRoleLabel(member.role, !!member.isSuspended)}
                </span>
              </p>
              {member.email && (
                <p className="text-[var(--afc-muted-2)]">
                  <span className="font-medium text-[var(--afc-text)]">Email :</span> {member.email}
                </p>
              )}
              {member.neighborhood && (
                <p className="text-[var(--afc-muted-2)]">
                  <span className="font-medium text-[var(--afc-text)]">Quartier :</span> {member.neighborhood}
                </p>
              )}
              {member.secondaryContact && (
                <p className="text-[var(--afc-muted-2)]">
                  <span className="font-medium text-[var(--afc-text)]">Contact secondaire :</span> {member.secondaryContact}
                </p>
              )}
              <p className="pt-2 text-sm text-[var(--afc-muted)]">
                Profil complété : {member.profileCompleted ? 'Oui' : 'Non'}
                {' · '}
                Statut : {member.isSuspended ? 'Inactif (ancien membre — ne paie pas sa cotisation)' : 'À jour'}
                {' · '}
                Membre depuis le {new Date(member.createdAt).toLocaleDateString('fr-FR')}
              </p>
              {member.isSuspended && isAdmin && (
                <div className="mt-4 border-t border-[var(--afc-border)] pt-4">
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={reactivating}
                    className="cursor-pointer rounded-xl border border-emerald-700/30 bg-emerald-900/20 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-900/35 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reactivating ? 'Réactivation…' : 'Réactiver le compte'}
                  </button>
                  <p className="mt-2 text-xs text-[var(--afc-muted)]">
                    Le membre pourra se connecter et devra régulariser ses cotisations (dette + mois en cours) pour accéder à la plateforme.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {auditLog.length > 0 && (
        <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Historique des actions</h2>
          <ul className="space-y-2 text-sm">
            {auditLog.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-2 border-b border-[rgba(var(--afc-hl),0.04)] py-2 last:border-0">
                <span className="font-medium text-[var(--afc-text)]">
                  {actionLabel(entry.action)}
                </span>
                <span className="text-[var(--afc-muted)]">
                  {new Date(entry.createdAt).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {entry.performedBy && (
                  <span className="text-[var(--afc-muted-2)]">
                    par {entry.performedBy.firstName} {entry.performedBy.lastName}
                  </span>
                )}
                {entry.details && (
                  <span className="max-w-xs truncate text-[var(--afc-muted)]" title={entry.details}>
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

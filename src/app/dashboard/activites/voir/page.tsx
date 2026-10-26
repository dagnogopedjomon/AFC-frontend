'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  Pencil,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { activitiesApi, type Activity, type Photo, type PublicationStatus } from '@/lib/api';
import { ConfirmModal } from '@/components/ConfirmModal';

const CAN_EDIT = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

/** Images acceptées et limites du cahier des charges (section 9). */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 60;

const dateLongue = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const TYPE_LABELS: Record<string, string> = {
  MATCH: 'Match', TRAINING: 'Entraînement', BIRTHDAY: 'Anniversaire', ANNOUNCEMENT: 'Annonce', OTHER: 'Autre',
};

const STATUS: Record<PublicationStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'Brouillon', tone: 'afc-badge-gray' },
  PUBLISHED: { label: 'Publié sur le site', tone: 'afc-badge-blue' },
  ARCHIVED: { label: 'Archivé', tone: 'afc-badge-amber' },
};

function ActivityDetailPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = searchParams.get('id') ?? '';
  const [activity, setActivity] = useState<(Activity & { photos: Photo[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'infos' | 'album'>('infos');
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState<Partial<Activity>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canEdit = !!user && CAN_EDIT.includes(user.role);

  const load = () => {
    if (!id) return;
    activitiesApi.one(id)
      .then((a) => { setActivity(a); setForm({ ...a }); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const photos = (activity?.photos ?? []).slice().sort((a, b) => a.position - b.position);
  const visibleCount = photos.filter((p) => p.visible).length;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      load();
      window.dispatchEvent(new Event('activities-updated'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () =>
    run(async () => {
      if (!activity) return;
      await activitiesApi.update(activity.id, {
        type: form.type,
        title: form.title,
        description: form.description || undefined,
        date: form.date,
        endDate: form.endDate || undefined,
        result: form.result || undefined,
        location: form.location || undefined,
      });
      setIsEditing(false);
    });

  const setStatus = (status: PublicationStatus) =>
    run(() => activitiesApi.setPublication(activity!.id, { status }));

  const uploadFiles = async (files: FileList | File[]) => {
    if (!activity) return;
    const list = Array.from(files);
    if (photos.length + list.length > MAX_PHOTOS) {
      setError(`L’album ne peut pas dépasser ${MAX_PHOTOS} photos.`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`« ${file.name} » : formats acceptés JPEG, PNG ou WebP.`);
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          setError(`« ${file.name} » : 5 Mo au maximum.`);
          continue;
        }
        await activitiesApi.uploadPhoto(file, activity.id);
      }
      load();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setUploading(false);
    }
  };

  const movePhoto = (index: number, delta: number) => {
    const next = photos.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(() => activitiesApi.reorderPhotos(activity!.id, next.map((p) => p.id)));
  };

  if (!id) return null;
  if (error && !activity) return <div className="card text-[var(--destructive)]">{error}</div>;
  if (loading) {
    return (
      <div className="card flex justify-center py-12">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-r-transparent" />
      </div>
    );
  }
  if (!activity) return <div className="card">Activité introuvable.</div>;

  const status = STATUS[activity.publicationStatus];

  return (
    <div className="space-y-5">
      <Link href="/dashboard/activites" className="afc-button-ghost">← Activités</Link>

      {/* En-tête de la maquette : titre, date · lieu, statut à droite */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] leading-tight text-[var(--afc-text)]">{activity.title}</h1>
          <p className="afc-mono mt-1 text-[12px] text-[var(--afc-muted)]">
            {dateLongue.format(new Date(activity.date))}
            {activity.location ? ` · ${activity.location}` : ''}
            {` · ${TYPE_LABELS[activity.type] ?? activity.type}`}
          </p>
        </div>
        <span className={`${status.tone} shrink-0 rounded-full border px-3 py-1 text-xs font-medium`}>{status.label}</span>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-[var(--afc-border)]">
        {([['infos', 'Informations'], ['album', `Album (${photos.length})`]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === key
                ? 'border-[var(--primary)] text-[var(--afc-text)]'
                : 'border-transparent text-[var(--afc-muted)] hover:text-[var(--afc-text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="afc-badge-red rounded-[10px] border px-4 py-3 text-sm">{error}</div>}

      {tab === 'infos' ? (
        <div className="space-y-5">
          <div className="card">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Type</label>
                  <select className="input-field" value={form.type || ''} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    {Object.keys(TYPE_LABELS).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Titre</label>
                  <input className="input-field" value={form.title || ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Lieu</label>
                  <input
                    className="input-field"
                    placeholder="Terrain de five, Cocody"
                    value={form.location || ''}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Description</label>
                  <textarea rows={3} className="input-field" value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Date</label>
                    <input type="date" className="input-field" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Fin</label>
                    <input type="date" className="input-field" value={form.endDate ? form.endDate.slice(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || null }))} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Résultat</label>
                  <input className="input-field" value={form.result || ''} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleSave} disabled={busy} className="btn-primary">Enregistrer</button>
                  <button type="button" onClick={() => { setIsEditing(false); setForm({ ...activity }); }} className="afc-button-secondary">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {activity.description && <p className="text-[var(--afc-text)]">{activity.description}</p>}
                <p className="text-sm text-[var(--afc-muted)]">Date : {dateLongue.format(new Date(activity.date))}</p>
                {activity.endDate && <p className="text-sm text-[var(--afc-muted)]">Fin : {dateLongue.format(new Date(activity.endDate))}</p>}
                {activity.location && <p className="text-sm text-[var(--afc-muted)]">Lieu : {activity.location}</p>}
                {activity.result && <p className="text-sm font-medium text-[var(--afc-text)]">Résultat : {activity.result}</p>}
                {canEdit && (
                  <div className="flex flex-wrap gap-2 pt-3">
                    <button type="button" onClick={() => setIsEditing(true)} className="afc-button-secondary">
                      <Pencil size={15} strokeWidth={1.7} /> Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="afc-button-secondary border-[var(--afc-badge-red-border)] text-[var(--destructive)]"
                    >
                      <Trash2 size={15} strokeWidth={1.7} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Publication sur le site public */}
          {canEdit && (
            <div className="card">
              <div className="flex items-start gap-3">
                <Globe size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-lg text-[var(--afc-text)]">Site public</h2>
                  <p className="mt-0.5 text-sm text-[var(--afc-muted)]">
                    Un événement publié apparaît sur la page d’accueil du club à la reconstruction suivante du site.
                    Un brouillon n’y apparaît jamais.
                  </p>
                  {activity.slug && (
                    <p className="afc-mono mt-2 text-xs text-[var(--afc-muted)]">Adresse : /evenements/{activity.slug}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {activity.publicationStatus !== 'PUBLISHED' && (
                      <button type="button" disabled={busy} onClick={() => setStatus('PUBLISHED')} className="btn-primary">
                        Publier sur le site
                      </button>
                    )}
                    {activity.publicationStatus === 'PUBLISHED' && (
                      <button type="button" disabled={busy} onClick={() => setStatus('DRAFT')} className="afc-button-secondary">
                        Retirer de la publication
                      </button>
                    )}
                    {activity.publicationStatus !== 'ARCHIVED' && (
                      <button type="button" disabled={busy} onClick={() => setStatus('ARCHIVED')} className="afc-button-secondary">
                        Archiver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Dépôt de photos */}
          {canEdit && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
              className={`rounded-[14px] border-2 border-dashed px-6 py-8 text-center transition ${
                dragOver ? 'border-[var(--primary)] bg-[var(--afc-badge-blue-bg)]' : 'border-[var(--afc-border)]'
              }`}
            >
              <p className="font-serif text-lg text-[var(--afc-text)]">Glissez des photos ici</p>
              <p className="mt-1 text-sm text-[var(--afc-muted)]">
                ou{' '}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="link-accent underline">
                  parcourez vos fichiers
                </button>{' '}
                · JPEG, PNG, WebP · 5 Mo par photo · {MAX_PHOTOS} photos au plus
              </p>
              {uploading && <p className="mt-2 text-sm text-[var(--primary)]">Envoi en cours…</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="afc-mono text-xs text-[var(--afc-muted)]">
              {photos.length} photo{photos.length > 1 ? 's' : ''} · {visibleCount} publiée{visibleCount > 1 ? 's' : ''}
            </p>
            {canEdit && (
              <label className="flex items-center gap-2 text-sm text-[var(--afc-text)]">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  style={{ accentColor: 'var(--primary)' }}
                  checked={activity.albumVisible}
                  disabled={busy}
                  onChange={(e) => run(() => activitiesApi.updateAlbum(activity.id, { albumVisible: e.target.checked }))}
                />
                Album visible sur le site
              </label>
            )}
          </div>

          {photos.length === 0 ? (
            <p className="card text-sm text-[var(--afc-muted)]">Aucune photo dans cet album.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {photos.map((p, index) => (
                <figure key={p.id} className="overflow-hidden rounded-[14px] border border-[var(--afc-border)] bg-[var(--afc-card)]">
                  <div className="relative">
                    <img src={p.url} alt={p.caption ?? ''} className="h-36 w-full object-cover" />
                    {activity.coverPhotoId === p.id && (
                      <span className="afc-badge-blue absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[11px] font-medium">
                        Couverture
                      </span>
                    )}
                    {!p.visible && (
                      <span className="afc-badge-gray absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[11px] font-medium">
                        Masquée
                      </span>
                    )}
                  </div>
                  <figcaption className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${p.caption ? 'text-[var(--afc-text)]' : 'text-[var(--destructive)]'}`}>
                        {p.caption || 'Sans légende'}
                      </span>
                      {canEdit && (
                        <span className="flex shrink-0 items-center gap-1 text-[var(--afc-muted)]">
                          <button
                            type="button"
                            title="Modifier la légende"
                            aria-label="Modifier la légende"
                            disabled={busy}
                            onClick={() => {
                              const caption = window.prompt('Légende de la photo', p.caption ?? '');
                              if (caption !== null) run(() => activitiesApi.updatePhoto(p.id, { caption }));
                            }}
                            className="rounded p-1 transition hover:text-[var(--primary)]"
                          >
                            <Pencil size={14} strokeWidth={1.7} />
                          </button>
                          <button
                            type="button"
                            title="Supprimer la photo"
                            aria-label="Supprimer la photo"
                            disabled={busy}
                            onClick={() => setPhotoToDelete(p)}
                            className="rounded p-1 transition hover:text-[var(--destructive)]"
                          >
                            <Trash2 size={14} strokeWidth={1.7} />
                          </button>
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="mt-1 flex items-center gap-1 border-t border-[var(--afc-border-soft)] pt-1.5 text-[var(--afc-muted)]">
                        <button
                          type="button"
                          title="Déplacer vers la gauche"
                          aria-label="Déplacer vers la gauche"
                          disabled={busy || index === 0}
                          onClick={() => movePhoto(index, -1)}
                          className="rounded p-1 transition hover:text-[var(--primary)] disabled:opacity-30"
                        >
                          <ArrowLeft size={14} strokeWidth={1.7} />
                        </button>
                        <button
                          type="button"
                          title="Déplacer vers la droite"
                          aria-label="Déplacer vers la droite"
                          disabled={busy || index === photos.length - 1}
                          onClick={() => movePhoto(index, 1)}
                          className="rounded p-1 transition hover:text-[var(--primary)] disabled:opacity-30"
                        >
                          <ArrowRight size={14} strokeWidth={1.7} />
                        </button>
                        <button
                          type="button"
                          title="Photo de couverture"
                          aria-label="Choisir comme photo de couverture"
                          disabled={busy}
                          onClick={() => run(() => activitiesApi.updateAlbum(activity.id, { coverPhotoId: p.id }))}
                          className={`rounded p-1 transition hover:text-[var(--primary)] ${
                            activity.coverPhotoId === p.id ? 'text-[var(--primary)]' : ''
                          }`}
                        >
                          <Star size={14} strokeWidth={1.7} />
                        </button>
                        <button
                          type="button"
                          title={p.visible ? 'Masquer sur le site' : 'Afficher sur le site'}
                          aria-label={p.visible ? 'Masquer sur le site' : 'Afficher sur le site'}
                          disabled={busy}
                          onClick={() => run(() => activitiesApi.updatePhoto(p.id, { visible: !p.visible }))}
                          className="ml-auto rounded p-1 transition hover:text-[var(--primary)]"
                        >
                          {p.visible ? <Eye size={14} strokeWidth={1.7} /> : <EyeOff size={14} strokeWidth={1.7} />}
                        </button>
                      </div>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <p className="text-xs text-[var(--afc-muted)]">
            « Masquée » : la photo reste dans l’album interne mais n’est pas publiée. L’album n’apparaît sur le site
            que si « Album visible sur le site » est coché et que l’événement est publié.
          </p>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Supprimer cette activité ?"
        message={`« ${activity.title} » et son album seront définitivement supprimés.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          try {
            await activitiesApi.delete(activity.id);
            window.dispatchEvent(new Event('activities-updated'));
            router.push('/dashboard/activites');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur');
          }
        }}
      />

      <ConfirmModal
        open={!!photoToDelete}
        title="Supprimer cette photo ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger
        onCancel={() => setPhotoToDelete(null)}
        onConfirm={() => {
          const photo = photoToDelete;
          setPhotoToDelete(null);
          if (photo) run(() => activitiesApi.deletePhoto(photo.id));
        }}
      />
    </div>
  );
}

export default function ActivityDetailPage() {
  return (
    <Suspense fallback={null}>
      <ActivityDetailPageInner />
    </Suspense>
  );
}

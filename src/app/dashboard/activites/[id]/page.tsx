'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { activitiesApi, type Activity, type Photo } from '@/lib/api';
import { Pencil, Trash2, Upload, X } from 'lucide-react';

const CAN_EDIT = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

function activityTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MATCH: 'Match', TRAINING: 'Entraînement', BIRTHDAY: 'Anniversaire', ANNOUNCEMENT: 'Annonce', OTHER: 'Autre',
  };
  return labels[type] ?? type;
}

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;
  const [activity, setActivity] = useState<(Activity & { photos: Photo[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Activity>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canEdit = user && CAN_EDIT.includes(user.role);

  const load = () => {
    if (!id) return;
    setLoading(true);
    activitiesApi.one(id)
      .then((a) => {
        setActivity(a);
        setForm({ ...a });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!activity) return;
    if (!confirm(`Supprimer l'activité « ${activity.title} » ?`)) return;
    setError(null);
    try {
      await activitiesApi.delete(activity.id);
      window.dispatchEvent(new Event('activities-updated'));
      router.push('/dashboard/activites');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleSave = async () => {
    if (!activity) return;
    setError(null);
    try {
      const updated = await activitiesApi.update(activity.id, {
        type: form.type,
        title: form.title,
        description: form.description || undefined,
        date: form.date,
        endDate: form.endDate || undefined,
        result: form.result || undefined,
      });
      setActivity(updated);
      setIsEditing(false);
      window.dispatchEvent(new Event('activities-updated'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activity || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    setError(null);
    try {
      await activitiesApi.uploadPhoto(file, activity.id);
      load();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Supprimer cette photo ?')) return;
    setDeletingPhoto(photoId);
    setError(null);
    try {
      await activitiesApi.deletePhoto(photoId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDeletingPhoto(null);
    }
  };

  if (!id) return null;
  if (error && !activity) return <div className="card text-red-600">{error}</div>;
  if (loading) return <div className="card flex justify-center py-12"><div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" /></div>;
  if (!activity) return <div className="card">Activité introuvable.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/activites" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Activités</Link>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              <Pencil size={16} />
              {isEditing ? 'Annuler' : 'Modifier'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium"
            >
              <Trash2 size={16} />
              Supprimer
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      <div className="card">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select className="input-field" value={form.type || ''} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {['MATCH', 'TRAINING', 'BIRTHDAY', 'ANNOUNCEMENT', 'OTHER'].map((t) => (
                  <option key={t} value={t}>{activityTypeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input className="input-field" value={form.title || ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={3} className="input-field" value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="input-field" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                <input type="date" className="input-field" value={form.endDate ? form.endDate.slice(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || null }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Résultat</label>
              <input className="input-field" value={form.result || ''} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleSave} className="btn-primary">Enregistrer</button>
              <button type="button" onClick={() => { setIsEditing(false); setForm({ ...activity }); }} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium">Annuler</button>
            </div>
          </div>
        ) : (
          <>
            <span className="inline-flex rounded-full bg-[var(--sky-blue-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--sky-blue-dark)]">
              {activityTypeLabel(activity.type)}
            </span>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mt-2">{activity.title}</h1>
            {activity.description && <p className="text-gray-600 mt-2">{activity.description}</p>}
            <p className="text-sm text-gray-500 mt-2">Date : {new Date(activity.date).toLocaleDateString('fr-FR')}</p>
            {activity.endDate && <p className="text-sm text-gray-500 mt-1">Fin : {new Date(activity.endDate).toLocaleDateString('fr-FR')}</p>}
            {activity.result && <p className="text-sm font-medium mt-1">Résultat : {activity.result}</p>}
          </>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Photos</h2>
          {canEdit && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--sky-blue)] text-white text-sm font-medium hover:bg-[var(--sky-blue-dark)] disabled:opacity-60"
            >
              <Upload size={16} />
              {uploading ? 'Envoi…' : 'Ajouter'}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
        {activity.photos && activity.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {activity.photos.map((p) => (
              <div key={p.id} className="group relative rounded-xl overflow-hidden border border-gray-100">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={p.url} alt={p.caption ?? ''} className="w-full h-32 sm:h-40 object-cover" />
                </a>
                {p.caption && <p className="p-2 text-sm text-gray-600">{p.caption}</p>}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(p.id)}
                    disabled={deletingPhoto === p.id}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                    aria-label="Supprimer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Aucune photo pour cette activité.</p>
        )}
      </div>
    </div>
  );
}


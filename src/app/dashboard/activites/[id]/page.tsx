'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { activitiesApi, type Activity, type Photo } from '@/lib/api';

function activityTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MATCH: 'Match', TRAINING: 'Entraînement', BIRTHDAY: 'Anniversaire', ANNOUNCEMENT: 'Annonce', OTHER: 'Autre',
  };
  return labels[type] ?? type;
}

export default function ActivityDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [activity, setActivity] = useState<(Activity & { photos: Photo[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    activitiesApi.one(id)
      .then(setActivity)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) return null;
  if (error) return <div className="card text-red-600">{error}</div>;
  if (loading) return <div className="card flex justify-center py-12"><div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" /></div>;
  if (!activity) return <div className="card">Activité introuvable.</div>;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/activites" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Activités</Link>
      <div className="card">
        <span className="inline-flex rounded-full bg-[var(--sky-blue-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--sky-blue-dark)]">
          {activityTypeLabel(activity.type)}
        </span>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mt-2">{activity.title}</h1>
        {activity.description && <p className="text-gray-600 mt-2">{activity.description}</p>}
        <p className="text-sm text-gray-500 mt-2">Date : {new Date(activity.date).toLocaleDateString('fr-FR')}</p>
        {activity.result && <p className="text-sm font-medium mt-1">Résultat : {activity.result}</p>}
      </div>
      {activity.photos && activity.photos.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Photos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {activity.photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-gray-100">
                <img src={p.url} alt={p.caption ?? ''} className="w-full h-32 object-cover" />
                {p.caption && <p className="p-2 text-sm text-gray-600">{p.caption}</p>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

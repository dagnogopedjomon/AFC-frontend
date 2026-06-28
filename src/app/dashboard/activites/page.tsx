'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { activitiesApi, type Activity, type Announcement } from '@/lib/api';

const BUREAU_OR_ADMIN = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

function activityTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MATCH: 'Match',
    TRAINING: 'Entraînement',
    BIRTHDAY: 'Anniversaire',
    ANNOUNCEMENT: 'Annonce',
    OTHER: 'Autre',
  };
  return labels[type] ?? type;
}

export default function ActivitesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreate = user && BUREAU_OR_ADMIN.includes(user.role);

  useEffect(() => {
    Promise.all([activitiesApi.list(), activitiesApi.announcements()])
      .then(([a, ann]) => {
        setActivities(a);
        setAnnouncements(ann);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));

    activitiesApi.markSeen().then(() => {
      window.dispatchEvent(new Event('activities-updated'));
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Activités & vie du club</h1>
          <p className="text-gray-600 mt-1">Matchs, entraînements, anniversaires, annonces.</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Link href="/dashboard/activites/nouvelle" className="btn-primary text-sm">
              Nouvelle activité
            </Link>
            <Link href="/dashboard/activites/annonce" className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium">
              Nouvelle annonce
            </Link>
          </div>
        )}
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
          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Annonces du bureau</h2>
            {announcements.length === 0 ? (
              <p className="text-gray-500">Aucune annonce.</p>
            ) : (
              <ul className="space-y-4">
                {announcements.map((a) => (
                  <li key={a.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <p className="font-medium text-[var(--foreground)]">{a.title}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {a.author.firstName} {a.author.lastName} — {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Activités (matchs, entraînements…)</h2>
            {activities.length === 0 ? (
              <p className="text-gray-500">Aucune activité.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activities.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => router.push(`/dashboard/activites/${a.id}`)}
                    className="text-left rounded-xl border border-gray-100 p-4 hover:bg-[var(--sky-blue-soft)]/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)]"
                  >
                    <span className="inline-flex rounded-full bg-[var(--sky-blue-soft)] px-2 py-0.5 text-xs font-medium text-[var(--sky-blue-dark)]">
                      {activityTypeLabel(a.type)}
                    </span>
                    <p className="font-medium text-[var(--foreground)] mt-2 line-clamp-2">{a.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{new Date(a.date).toLocaleDateString('fr-FR')}</p>
                    {a.result && <p className="text-sm text-gray-600 mt-1">Résultat : {a.result}</p>}
                    {a._count && a._count.photos > 0 && (
                      <p className="text-xs text-gray-500 mt-2">{a._count.photos} photo{a._count.photos > 1 ? 's' : ''}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

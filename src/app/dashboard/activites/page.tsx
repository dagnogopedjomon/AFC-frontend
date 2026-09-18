'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
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
    <div className="space-y-5">
      <header className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Activités &amp; vie du club</h1>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Matchs, entraînements, anniversaires, annonces.</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Link href="/dashboard/activites/nouvelle" className="afc-button-primary text-sm">
              <Plus size={15} strokeWidth={2} aria-hidden="true" /> Nouvelle activité
            </Link>
            <Link href="/dashboard/activites/annonce" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(var(--afc-hl),0.1)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]">
              <Plus size={15} strokeWidth={2} aria-hidden="true" /> Nouvelle annonce
            </Link>
          </div>
        )}
      </header>

      {error && (
        <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-3 text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
            <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Annonces du bureau</h2>
            {announcements.length === 0 ? (
              <p className="text-[var(--afc-muted)]">Aucune annonce.</p>
            ) : (
              <ul className="space-y-4">
                {announcements.map((a) => (
                  <li key={a.id} className="border-b border-[var(--afc-border)] pb-4 last:border-0">
                    <p className="font-medium text-[var(--afc-text)]">{a.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--afc-muted-2)]">{a.content}</p>
                    <p className="mt-2 text-xs text-[var(--afc-muted)]">
                      {a.author.firstName} {a.author.lastName} — {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
            <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">Activités (matchs, entraînements…)</h2>
            {activities.length === 0 ? (
              <p className="text-[var(--afc-muted)]">Aucune activité.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activities.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => router.push(`/dashboard/activites/${a.id}`)}
                    className="rounded-xl border border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] p-4 text-left transition hover:border-[#C9A048]/30 hover:bg-[#C9A048]/[0.06] focus:outline-none focus:ring-2 focus:ring-[#C9A048]/40"
                  >
                    <span className="inline-flex rounded-full border border-blue-700/30 bg-blue-900/20 px-2 py-0.5 text-xs font-medium text-blue-300">
                      {activityTypeLabel(a.type)}
                    </span>
                    <p className="mt-2 line-clamp-2 font-medium text-[var(--afc-text)]">{a.title}</p>
                    <p className="mt-1 text-sm text-[var(--afc-muted-2)]">{new Date(a.date).toLocaleDateString('fr-FR')}</p>
                    {a.result && <p className="mt-1 text-sm text-[var(--afc-muted-2)]">Résultat : {a.result}</p>}
                    {a._count && a._count.photos > 0 && (
                      <p className="mt-2 text-xs text-[var(--afc-muted)]">{a._count.photos} photo{a._count.photos > 1 ? 's' : ''}</p>
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

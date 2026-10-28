'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Globe, Newspaper, Plus, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  articlesApi,
  type ArticleCategory,
  type ClubArticle,
  type PublicationStatus,
} from '@/lib/api';

const CAN_EDIT = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

/** Les quatre rubriques de la section 5, dans l'ordre où le site les affiche. */
const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: 'VIE_DU_CLUB', label: 'Vie du club' },
  { value: 'REGLES', label: 'Règles' },
  { value: 'COMMUNIQUES', label: 'Communiqués' },
  { value: 'COMPTES_RENDUS', label: 'Comptes rendus' },
];
const NOM_CATEGORIE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<ArticleCategory, string>;

const STATUS: Record<PublicationStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'Brouillon', tone: 'afc-badge-gray' },
  PUBLISHED: { label: 'Publié sur le site', tone: 'afc-badge-blue' },
  ARCHIVED: { label: 'Archivé', tone: 'afc-badge-amber' },
};

const dateLongue = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const dateHeure = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function ArticlesPage() {
  const { user } = useAuth();
  const canEdit = !!user && CAN_EDIT.includes(user.role);

  const [articles, setArticles] = useState<ClubArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<PublicationStatus | ''>('');
  const [filtreCategorie, setFiltreCategorie] = useState<ArticleCategory | ''>('');

  useEffect(() => {
    setLoading(true);
    articlesApi
      .list()
      .then(setArticles)
      .catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, []);

  /** Recherche et filtres côté navigateur : la liste du club reste courte. */
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return articles.filter((a) => {
      if (filtreStatut && a.publicationStatus !== filtreStatut) return false;
      if (filtreCategorie && a.category !== filtreCategorie) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.excerpt ?? '').toLowerCase().includes(q) ||
        (a.authorName ?? '').toLowerCase().includes(q)
      );
    });
  }, [articles, recherche, filtreStatut, filtreCategorie]);

  const maintenant = Date.now();
  const parus = articles.filter(
    (a) => a.publicationStatus === 'PUBLISHED' && a.publishedAt && new Date(a.publishedAt).getTime() <= maintenant,
  ).length;
  const programmes = articles.filter(
    (a) => a.publicationStatus === 'PUBLISHED' && a.publishedAt && new Date(a.publishedAt).getTime() > maintenant,
  ).length;

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--afc-border)] border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      {error && <div className="afc-badge-red rounded-[10px] border px-4 py-3 text-sm">{error}</div>}

      {/* Rappel de ce que le site montre, comme sur les écrans Événements et Documents. */}
      <div className="card">
        <div className="flex items-start gap-3">
          <Globe size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[var(--primary)]" />
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg text-[var(--afc-text)]">Site public</h2>
            <p className="mt-0.5 text-sm text-[var(--afc-muted)]">
              Les articles parus alimentent la page « Blog » du site, reçoivent chacun leur page, et les plus
              récents apparaissent sur l’accueil. Un brouillon n’y apparaît jamais ; un article programmé attend
              sa date.
            </p>
            <p className="afc-mono mt-2 text-xs text-[var(--afc-muted)]">
              {parus} paru{parus > 1 ? 's' : ''}
              {programmes > 0 && ` · ${programmes} programmé${programmes > 1 ? 's' : ''}`} · {articles.length} au
              total
            </p>
          </div>
        </div>
      </div>

      {canEdit && (
        <Link href="/dashboard/articles/editeur" className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} strokeWidth={2} />
          Écrire un article
        </Link>
      )}

      {/* Recherche et filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            strokeWidth={1.7}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--afc-muted)]"
            aria-hidden="true"
          />
          <input
            className="input-field !pl-10"
            placeholder="Rechercher un article"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
        <select
          className="input-field sm:!w-auto"
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value as PublicationStatus | '')}
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS) as PublicationStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS[s].label}
            </option>
          ))}
        </select>
        <select
          className="input-field sm:!w-auto"
          value={filtreCategorie}
          onChange={(e) => setFiltreCategorie(e.target.value as ArticleCategory | '')}
        >
          <option value="">Toutes les rubriques</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {visibles.length === 0 ? (
        <div className="card text-center">
          <Newspaper size={24} strokeWidth={1.5} className="mx-auto text-[var(--afc-muted)]" />
          <p className="mt-3 font-serif text-lg text-[var(--afc-text)]">
            {articles.length === 0 ? 'Aucun article pour le moment' : 'Aucun article ne correspond'}
          </p>
          <p className="mt-1 text-sm text-[var(--afc-muted)]">
            {articles.length === 0
              ? 'Communiqués, comptes rendus et vie du club s’écrivent ici.'
              : 'Changez la recherche ou les filtres.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map((a) => {
            const programme =
              a.publicationStatus === 'PUBLISHED' &&
              a.publishedAt != null &&
              new Date(a.publishedAt).getTime() > maintenant;
            return (
              <Link
                key={a.id}
                href={`/dashboard/articles/editeur?id=${a.id}`}
                className="card card-hover block"
              >
                <div className="flex flex-wrap items-start gap-4">
                  {a.coverUrl ? (
                    <img
                      src={a.coverUrl}
                      alt={a.coverAlt ?? ''}
                      className="h-16 w-24 shrink-0 rounded-[8px] border border-[var(--afc-border)] object-cover"
                    />
                  ) : (
                    <span className="mt-0.5 shrink-0 text-[var(--primary)]">
                      <Newspaper size={20} strokeWidth={1.6} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-lg text-[var(--afc-text)]">{a.title}</h3>
                      <span
                        className={`${programme ? 'afc-badge-violet' : STATUS[a.publicationStatus].tone} rounded-full border px-2 py-0.5 text-[11px] font-medium`}
                      >
                        {programme ? 'Programmé' : STATUS[a.publicationStatus].label}
                      </span>
                    </div>
                    {a.excerpt && (
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--afc-muted)]">{a.excerpt}</p>
                    )}
                    <p className="afc-mono mt-2 text-xs text-[var(--afc-muted)]">
                      {NOM_CATEGORIE[a.category]}
                      {a.publishedAt &&
                        ` · ${programme ? dateHeure.format(new Date(a.publishedAt)) : dateLongue.format(new Date(a.publishedAt))}`}
                      {a.authorName && ` · ${a.authorName}`}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

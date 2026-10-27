'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Globe,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  documentsApi,
  type ClubDocument,
  type DocumentCategory,
  type PublicationStatus,
} from '@/lib/api';
import { ConfirmModal } from '@/components/ConfirmModal';

const CAN_EDIT = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

/** Fichiers acceptés et limites du cahier des charges (section 9). */
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_BYTES = 10 * 1024 * 1024;

/** Les quatre catégories de la section 5, dans l'ordre où le site les affiche. */
const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'STATUTS', label: 'Statuts' },
  { value: 'REGLEMENT', label: 'Règlement' },
  { value: 'COMPTES_RENDUS', label: 'Comptes rendus' },
  { value: 'AUTRES', label: 'Autres' },
];
const NOM_CATEGORIE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<DocumentCategory, string>;

const STATUS: Record<PublicationStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'Brouillon', tone: 'afc-badge-gray' },
  PUBLISHED: { label: 'Publié sur le site', tone: 'afc-badge-blue' },
  ARCHIVED: { label: 'Archivé', tone: 'afc-badge-amber' },
};

const dateLongue = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/** « 480 Ko », « 2,4 Mo » — même présentation que sur le site public. */
function taille(octets: number): string {
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}

/** Message de refus commun au choix de fichier et au glisser-déposer. */
function refus(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `« ${file.name} » : formats acceptés, PDF ou Word.`;
  if (file.size > MAX_BYTES) return `« ${file.name} » : 10 Mo au maximum, ce fichier en fait ${taille(file.size)}.`;
  return null;
}

type Brouillon = {
  title: string;
  description: string;
  category: DocumentCategory;
  date: string;
};

const BROUILLON_VIDE: Brouillon = {
  title: '',
  description: '',
  category: 'AUTRES',
  date: new Date().toISOString().slice(0, 10),
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const canEdit = !!user && CAN_EDIT.includes(user.role);

  const [documents, setDocuments] = useState<ClubDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<PublicationStatus | ''>('');
  const [filtreCategorie, setFiltreCategorie] = useState<DocumentCategory | ''>('');

  // Dépôt d'un nouveau document.
  const [fichier, setFichier] = useState<File | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon>(BROUILLON_VIDE);
  const [dragOver, setDragOver] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);

  // Modification d'un document existant.
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [edition, setEdition] = useState<Brouillon>(BROUILLON_VIDE);
  const champRemplacement = useRef<HTMLInputElement>(null);
  const [aRemplacer, setARemplacer] = useState<string | null>(null);

  const [aSupprimer, setASupprimer] = useState<ClubDocument | null>(null);

  const charger = () => {
    setLoading(true);
    documentsApi
      .list()
      .then(setDocuments)
      .catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  };

  useEffect(charger, []);

  /** Recherche et filtres appliqués côté navigateur : la liste du club reste courte. */
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return documents.filter((d) => {
      if (filtreStatut && d.publicationStatus !== filtreStatut) return false;
      if (filtreCategorie && d.category !== filtreCategorie) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q)
      );
    });
  }, [documents, recherche, filtreStatut, filtreCategorie]);

  /** Groupées comme sur le site : une section par catégorie, dans l'ordre de la charte. */
  const groupes = useMemo(
    () =>
      CATEGORIES.map((c) => ({ ...c, items: visibles.filter((d) => d.category === c.value) })).filter(
        (g) => g.items.length > 0,
      ),
    [visibles],
  );

  const publies = documents.filter((d) => d.publicationStatus === 'PUBLISHED').length;

  function choisirFichier(f: File | null) {
    if (!f) return;
    const probleme = refus(f);
    if (probleme) {
      setError(probleme);
      return;
    }
    setError(null);
    setFichier(f);
    // Le titre se devine du nom du fichier tant que personne ne l'a saisi.
    setBrouillon((b) => ({ ...b, title: b.title || f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }));
  }

  async function deposer() {
    if (!fichier || !brouillon.title.trim()) return;
    setEnvoi(true);
    setError(null);
    try {
      await documentsApi.create(fichier, {
        title: brouillon.title.trim(),
        description: brouillon.description.trim() || undefined,
        category: brouillon.category,
        date: brouillon.date,
      });
      setFichier(null);
      setBrouillon(BROUILLON_VIDE);
      if (champFichier.current) champFichier.current.value = '';
      charger();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dépôt impossible');
    } finally {
      setEnvoi(false);
    }
  }

  async function changerStatut(d: ClubDocument, status: PublicationStatus) {
    setBusyId(d.id);
    setError(null);
    try {
      const maj = await documentsApi.setPublication(d.id, status);
      setDocuments((liste) => liste.map((x) => (x.id === d.id ? { ...x, ...maj } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusyId(null);
    }
  }

  async function enregistrerEdition(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const maj = await documentsApi.update(id, {
        title: edition.title.trim(),
        description: edition.description.trim(),
        category: edition.category,
        date: edition.date,
      });
      setDocuments((liste) => liste.map((x) => (x.id === id ? { ...x, ...maj } : x)));
      setEnEdition(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setBusyId(null);
    }
  }

  async function remplacerFichier(id: string, f: File | null) {
    if (!f) return;
    const probleme = refus(f);
    if (probleme) {
      setError(probleme);
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const maj = await documentsApi.replaceFile(id, f);
      setDocuments((liste) => liste.map((x) => (x.id === id ? { ...x, ...maj } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remplacement impossible');
    } finally {
      setBusyId(null);
      setARemplacer(null);
      if (champRemplacement.current) champRemplacement.current.value = '';
    }
  }

  async function supprimer() {
    if (!aSupprimer) return;
    setBusyId(aSupprimer.id);
    try {
      await documentsApi.delete(aSupprimer.id);
      setDocuments((liste) => liste.filter((x) => x.id !== aSupprimer.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setBusyId(null);
      setASupprimer(null);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--afc-border)] border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      {error && (
        <div className="afc-badge-red rounded-[10px] border px-4 py-3 text-sm">{error}</div>
      )}

      {/* Rappel de ce que le site montre, comme sur la fiche d'un événement. */}
      <div className="card">
        <div className="flex items-start gap-3">
          <Globe size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[var(--primary)]" />
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg text-[var(--afc-text)]">Site public</h2>
            <p className="mt-0.5 text-sm text-[var(--afc-muted)]">
              Les documents publiés apparaissent sur la page « Documents » du site du club, et les quatre plus
              récents sur la page d’accueil. Un brouillon n’y apparaît jamais ; un document retiré disparaît du
              site à la reconstruction suivante.
            </p>
            <p className="afc-mono mt-2 text-xs text-[var(--afc-muted)]">
              {publies} document{publies > 1 ? 's' : ''} publié{publies > 1 ? 's' : ''} · {documents.length} au total
            </p>
          </div>
        </div>
      </div>

      {/* Dépôt */}
      {canEdit && (
        <div className="card">
          <h2 className="font-serif text-lg text-[var(--afc-text)]">Déposer un document</h2>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">
            PDF ou Word · 10 Mo au plus. Le type est vérifié sur le contenu du fichier, pas sur son extension.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              choisirFichier(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`mt-4 rounded-[14px] border-2 border-dashed px-6 py-8 text-center transition-colors ${
              dragOver ? 'border-[var(--primary)] bg-[var(--afc-badge-blue-bg)]' : 'border-[var(--afc-border)]'
            }`}
          >
            <Upload size={22} strokeWidth={1.6} className="mx-auto text-[var(--afc-muted)]" />
            {fichier ? (
              <p className="mt-2 text-sm text-[var(--afc-text)]">
                <span className="font-medium">{fichier.name}</span>
                <span className="afc-mono ml-2 text-xs text-[var(--afc-muted)]">{taille(fichier.size)}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-[var(--afc-muted)]">Glissez un fichier ici, ou</p>
            )}
            <button
              type="button"
              onClick={() => champFichier.current?.click()}
              className="afc-button-secondary mx-auto mt-3"
            >
              {fichier ? 'Choisir un autre fichier' : 'Parcourir'}
            </button>
            <input
              ref={champFichier}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)}
            />
          </div>

          {fichier && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Titre</label>
                <input
                  className="input-field"
                  value={brouillon.title}
                  onChange={(e) => setBrouillon((b) => ({ ...b, title: e.target.value }))}
                  placeholder="Statuts de l’Amicale Football Club"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Description</label>
                <input
                  className="input-field"
                  value={brouillon.description}
                  onChange={(e) => setBrouillon((b) => ({ ...b, description: e.target.value }))}
                  placeholder="Une ligne, affichée sous le titre sur le site."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Catégorie</label>
                  <select
                    className="input-field"
                    value={brouillon.category}
                    onChange={(e) => setBrouillon((b) => ({ ...b, category: e.target.value as DocumentCategory }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Date du document</label>
                  <input
                    type="date"
                    className="input-field"
                    value={brouillon.date}
                    onChange={(e) => setBrouillon((b) => ({ ...b, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={deposer}
                  disabled={envoi || !brouillon.title.trim()}
                  className="btn-primary"
                >
                  {envoi ? 'Dépôt…' : 'Déposer en brouillon'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFichier(null);
                    setBrouillon(BROUILLON_VIDE);
                    if (champFichier.current) champFichier.current.value = '';
                  }}
                  className="afc-button-secondary"
                >
                  Annuler
                </button>
              </div>
              <p className="text-xs text-[var(--afc-muted)]">
                Le document est enregistré en brouillon : il ne part sur le site qu’une fois publié.
              </p>
            </div>
          )}
        </div>
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
            placeholder="Rechercher un document"
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
          onChange={(e) => setFiltreCategorie(e.target.value as DocumentCategory | '')}
        >
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {groupes.length === 0 ? (
        <div className="card text-center">
          <FileText size={24} strokeWidth={1.5} className="mx-auto text-[var(--afc-muted)]" />
          <p className="mt-3 font-serif text-lg text-[var(--afc-text)]">
            {documents.length === 0 ? 'Aucun document pour le moment' : 'Aucun document ne correspond'}
          </p>
          <p className="mt-1 text-sm text-[var(--afc-muted)]">
            {documents.length === 0
              ? 'Le règlement, les statuts et les comptes rendus se déposent ici.'
              : 'Changez la recherche ou les filtres.'}
          </p>
        </div>
      ) : (
        groupes.map((groupe) => (
          <section key={groupe.value} className="space-y-3">
            <h2 className="afc-eyebrow">— {groupe.label}</h2>
            {groupe.items.map((d) => {
              const occupe = busyId === d.id;
              return (
                <div key={d.id} className="card">
                  {enEdition === d.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Titre</label>
                        <input
                          className="input-field"
                          value={edition.title}
                          onChange={(e) => setEdition((b) => ({ ...b, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Description</label>
                        <input
                          className="input-field"
                          value={edition.description}
                          onChange={(e) => setEdition((b) => ({ ...b, description: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Catégorie</label>
                          <select
                            className="input-field"
                            value={edition.category}
                            onChange={(e) => setEdition((b) => ({ ...b, category: e.target.value as DocumentCategory }))}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Date du document</label>
                          <input
                            type="date"
                            className="input-field"
                            value={edition.date}
                            onChange={(e) => setEdition((b) => ({ ...b, date: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => enregistrerEdition(d.id)}
                          disabled={occupe || !edition.title.trim()}
                          className="btn-primary"
                        >
                          Enregistrer
                        </button>
                        <button type="button" onClick={() => setEnEdition(null)} className="afc-button-secondary">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start gap-4">
                      <span className="mt-0.5 shrink-0 text-[var(--primary)]">
                        <FileText size={20} strokeWidth={1.6} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-lg text-[var(--afc-text)]">{d.title}</h3>
                          <span
                            className={`${STATUS[d.publicationStatus].tone} rounded-full border px-2 py-0.5 text-[11px] font-medium`}
                          >
                            {STATUS[d.publicationStatus].label}
                          </span>
                        </div>
                        {d.description && (
                          <p className="mt-1 text-sm text-[var(--afc-muted)]">{d.description}</p>
                        )}
                        <p className="afc-mono mt-2 text-xs text-[var(--afc-muted)]">
                          {d.fileType.toUpperCase()} · {taille(d.fileSize)} · {dateLongue.format(new Date(d.date))}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <a
                            href={d.fileUrl}
                            download={d.fileName}
                            rel="noopener"
                            target="_blank"
                            className="afc-button-secondary"
                          >
                            Télécharger
                          </a>
                          {canEdit && (
                            <>
                              {d.publicationStatus !== 'PUBLISHED' && (
                                <button
                                  type="button"
                                  disabled={occupe}
                                  onClick={() => changerStatut(d, 'PUBLISHED')}
                                  className="btn-primary"
                                >
                                  Publier sur le site
                                </button>
                              )}
                              {d.publicationStatus === 'PUBLISHED' && (
                                <button
                                  type="button"
                                  disabled={occupe}
                                  onClick={() => changerStatut(d, 'DRAFT')}
                                  className="afc-button-secondary"
                                >
                                  Retirer de la publication
                                </button>
                              )}
                              {d.publicationStatus !== 'ARCHIVED' && (
                                <button
                                  type="button"
                                  disabled={occupe}
                                  onClick={() => changerStatut(d, 'ARCHIVED')}
                                  className="afc-button-secondary"
                                >
                                  Archiver
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={occupe}
                                onClick={() => {
                                  setEnEdition(d.id);
                                  setEdition({
                                    title: d.title,
                                    description: d.description ?? '',
                                    category: d.category,
                                    date: d.date.slice(0, 10),
                                  });
                                }}
                                className="afc-button-secondary"
                              >
                                <Pencil size={15} strokeWidth={1.7} /> Modifier
                              </button>
                              <button
                                type="button"
                                disabled={occupe}
                                onClick={() => {
                                  setARemplacer(d.id);
                                  champRemplacement.current?.click();
                                }}
                                className="afc-button-secondary"
                              >
                                <RefreshCw size={15} strokeWidth={1.7} /> Remplacer le fichier
                              </button>
                              <button
                                type="button"
                                disabled={occupe}
                                onClick={() => setASupprimer(d)}
                                className="afc-button-secondary border-[var(--afc-badge-red-border)] text-[var(--destructive)]"
                              >
                                <Trash2 size={15} strokeWidth={1.7} /> Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))
      )}

      {/* Champ partagé par tous les boutons « Remplacer le fichier ». */}
      <input
        ref={champRemplacement}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          if (aRemplacer) remplacerFichier(aRemplacer, e.target.files?.[0] ?? null);
        }}
      />

      <ConfirmModal
        open={!!aSupprimer}
        title="Supprimer ce document ?"
        message={
          aSupprimer?.publicationStatus === 'PUBLISHED'
            ? `« ${aSupprimer?.title} » est publié : il disparaîtra aussi du site à la reconstruction suivante. Cette action est définitive.`
            : `« ${aSupprimer?.title} » sera supprimé définitivement.`
        }
        confirmLabel="Supprimer"
        danger
        loading={!!busyId}
        onConfirm={supprimer}
        onCancel={() => setASupprimer(null)}
      />
    </div>
  );
}

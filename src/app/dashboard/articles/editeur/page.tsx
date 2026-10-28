'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Bold,
  Eye,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Quote,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  articlesApi,
  type ArticleCategory,
  type ClubArticle,
  type PublicationStatus,
} from '@/lib/api';
import { ConfirmModal } from '@/components/ConfirmModal';

const CAN_EDIT = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

/** Les quatre rubriques de la section 5 du cahier des charges. */
const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: 'VIE_DU_CLUB', label: 'Vie du club' },
  { value: 'REGLES', label: 'Règles' },
  { value: 'COMMUNIQUES', label: 'Communiqués' },
  { value: 'COMPTES_RENDUS', label: 'Comptes rendus' },
];

const STATUS: Record<PublicationStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'Brouillon', tone: 'afc-badge-gray' },
  PUBLISHED: { label: 'Publié sur le site', tone: 'afc-badge-blue' },
  ARCHIVED: { label: 'Archivé', tone: 'afc-badge-amber' },
};

/** Images acceptées pour la couverture et le corps (section 9). */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const dateHeure = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** « 2026-11-14T16:00 », ce que l'élément de saisie attend. */
function pourChampDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function refusImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return `« ${file.name} » : formats acceptés, JPEG, PNG ou WebP.`;
  if (file.size > MAX_IMAGE_BYTES) return `« ${file.name} » : 5 Mo au maximum.`;
  return null;
}

export default function EditeurArticlePage() {
  return (
    <Suspense fallback={<div className="grid place-items-center py-20"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--afc-border)] border-t-[var(--primary)]" /></div>}>
      <Editeur />
    </Suspense>
  );
}

function Editeur() {
  const { user } = useAuth();
  const router = useRouter();
  const canEdit = !!user && CAN_EDIT.includes(user.role);
  const id = useSearchParams().get('id');

  const [article, setArticle] = useState<ClubArticle | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [apercu, setApercu] = useState(false);
  const [aSupprimer, setASupprimer] = useState(false);

  const [titre, setTitre] = useState('');
  const [extrait, setExtrait] = useState('');
  const [categorie, setCategorie] = useState<ArticleCategory>('VIE_DU_CLUB');
  const [signature, setSignature] = useState('');
  const [parution, setParution] = useState('');
  const [coverAlt, setCoverAlt] = useState('');

  const corps = useRef<HTMLDivElement>(null);
  const champCouverture = useRef<HTMLInputElement>(null);
  const champImage = useRef<HTMLInputElement>(null);

  /** Remplit le formulaire depuis l'article reçu du serveur. */
  const remplir = useCallback((a: ClubArticle) => {
    setArticle(a);
    setTitre(a.title);
    setExtrait(a.excerpt ?? '');
    setCategorie(a.category);
    setSignature(a.authorName ?? '');
    setParution(pourChampDate(a.publishedAt));
    setCoverAlt(a.coverAlt ?? '');
    if (corps.current) corps.current.innerHTML = a.contentHtml;
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    articlesApi
      .one(id)
      .then(remplir)
      .catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, [id, remplir]);

  /** Mise en forme : l'éditeur du navigateur fait le travail, le serveur assainit ensuite. */
  function formater(commande: string, valeur?: string) {
    corps.current?.focus();
    document.execCommand(commande, false, valeur);
  }

  function poserLien() {
    const adresse = window.prompt('Adresse du lien (https://… ou /documents/)');
    if (!adresse) return;
    formater('createLink', adresse);
  }

  /** Enregistre, en créant l'article s'il n'existe pas encore. */
  async function enregistrer(): Promise<ClubArticle | null> {
    if (!titre.trim()) {
      setError('Le titre est obligatoire.');
      return null;
    }
    setOccupe(true);
    setError(null);
    try {
      const champs = {
        title: titre.trim(),
        excerpt: extrait.trim(),
        contentHtml: corps.current?.innerHTML ?? '',
        category: categorie,
        authorName: signature.trim(),
        coverAlt: coverAlt.trim(),
        ...(parution ? { publishedAt: new Date(parution).toISOString() } : {}),
      };
      const maj = article
        ? await articlesApi.update(article.id, champs)
        : await articlesApi.create(champs);
      remplir(maj);
      setMessage('Enregistré.');
      if (!article) router.replace(`/dashboard/articles/editeur?id=${maj.id}`);
      return maj;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
      return null;
    } finally {
      setOccupe(false);
    }
  }

  /** Publier, programmer, retirer ou archiver : on enregistre d'abord le texte en cours. */
  async function changerStatut(status: PublicationStatus) {
    const enregistre = await enregistrer();
    if (!enregistre) return;
    setOccupe(true);
    setError(null);
    try {
      const maj = await articlesApi.setPublication(
        enregistre.id,
        status,
        parution ? new Date(parution).toISOString() : undefined,
      );
      remplir(maj);
      setMessage(
        status === 'PUBLISHED'
          ? maj.publishedAt && new Date(maj.publishedAt) > new Date()
            ? `Programmé pour le ${dateHeure.format(new Date(maj.publishedAt))}.`
            : 'Publié. Le site se met à jour à la reconstruction suivante.'
          : status === 'ARCHIVED'
            ? 'Archivé.'
            : 'Retiré du site.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setOccupe(false);
    }
  }

  async function deposerCouverture(file: File | null) {
    if (!file) return;
    const probleme = refusImage(file);
    if (probleme) {
      setError(probleme);
      return;
    }
    const cible = article ?? (await enregistrer());
    if (!cible) return;
    setOccupe(true);
    try {
      remplir(await articlesApi.setCover(cible.id, file, coverAlt.trim() || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dépôt impossible');
    } finally {
      setOccupe(false);
      if (champCouverture.current) champCouverture.current.value = '';
    }
  }

  async function retirerCouverture() {
    if (!article) return;
    setOccupe(true);
    try {
      remplir(await articlesApi.removeCover(article.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retrait impossible');
    } finally {
      setOccupe(false);
    }
  }

  /** Image insérée dans le corps : déposée d'abord, placée ensuite à l'endroit du curseur. */
  async function insererImage(file: File | null) {
    if (!file) return;
    const probleme = refusImage(file);
    if (probleme) {
      setError(probleme);
      return;
    }
    const cible = article ?? (await enregistrer());
    if (!cible) return;
    setOccupe(true);
    try {
      const { url } = await articlesApi.uploadImage(cible.id, file);
      formater('insertImage', url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dépôt impossible');
    } finally {
      setOccupe(false);
      if (champImage.current) champImage.current.value = '';
    }
  }

  async function supprimer() {
    if (!article) return;
    setOccupe(true);
    try {
      await articlesApi.delete(article.id);
      router.push('/dashboard/articles');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
      setOccupe(false);
      setASupprimer(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="card text-center">
        <p className="font-serif text-lg text-[var(--afc-text)]">Réservé au bureau</p>
        <p className="mt-1 text-sm text-[var(--afc-muted)]">
          La rédaction des articles du site est réservée aux membres du bureau.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--afc-border)] border-t-[var(--primary)]" />
      </div>
    );
  }

  const programme =
    article?.publicationStatus === 'PUBLISHED' &&
    article.publishedAt != null &&
    new Date(article.publishedAt) > new Date();

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/articles" className="afc-button-ghost inline-flex items-center gap-2">
          <ArrowLeft size={16} strokeWidth={1.8} />
          Tous les articles
        </Link>
        <div className="flex items-center gap-2">
          {article && (
            <span
              className={`${STATUS[article.publicationStatus].tone} rounded-full border px-2.5 py-1 text-[11px] font-medium`}
            >
              {programme ? 'Programmé' : STATUS[article.publicationStatus].label}
            </span>
          )}
          <button
            type="button"
            onClick={() => setApercu((v) => !v)}
            className="afc-button-secondary inline-flex items-center gap-2"
          >
            {apercu ? <Pencil size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
            {apercu ? 'Reprendre la rédaction' : 'Aperçu'}
          </button>
        </div>
      </div>

      {error && <div className="afc-badge-red rounded-[10px] border px-4 py-3 text-sm">{error}</div>}
      {message && !error && (
        <div className="afc-badge-emerald rounded-[10px] border px-4 py-3 text-sm">{message}</div>
      )}

      {apercu ? (
        /* Aperçu avant publication (section 6) : la mise en page du site, en petit. */
        <article className="card">
          <p className="afc-eyebrow">— {CATEGORIES.find((c) => c.value === categorie)?.label}</p>
          <h1 className="mt-2 font-serif text-2xl text-[var(--afc-text)]">{titre || 'Sans titre'}</h1>
          <p className="afc-mono mt-2 text-xs text-[var(--afc-muted)]">
            {parution ? dateHeure.format(new Date(parution)) : 'Date de parution non fixée'}
            {signature && ` · Par ${signature}`}
          </p>
          {article?.coverUrl && (
            <img
              src={article.coverUrl}
              alt={coverAlt}
              className="mt-4 w-full rounded-[12px] border border-[var(--afc-border)]"
            />
          )}
          {extrait && <p className="mt-4 text-sm italic text-[var(--afc-muted)]">{extrait}</p>}
          <div
            className="afc-prose mt-4"
            dangerouslySetInnerHTML={{ __html: corps.current?.innerHTML ?? '' }}
          />
        </article>
      ) : (
        <>
          <div className="card space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Titre</label>
              <input
                className="input-field"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Retour sur l’assemblée générale"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Extrait</label>
              <textarea
                className="input-field min-h-[76px]"
                value={extrait}
                onChange={(e) => setExtrait(e.target.value)}
                placeholder="Deux phrases, affichées dans la liste du blog. Laissez vide pour les prendre au début de l’article."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Rubrique</label>
                <select
                  className="input-field"
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value as ArticleCategory)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Signature</label>
                <input
                  className="input-field"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Le bureau"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">Parution</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={parution}
                  onChange={(e) => setParution(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-[var(--afc-muted)]">
              Une date de parution à venir programme l’article : il reste invisible du site jusque-là. Laissée
              vide, elle est fixée au moment de la publication.
            </p>
          </div>

          {/* Image de couverture */}
          <div className="card">
            <h2 className="font-serif text-lg text-[var(--afc-text)]">Image de couverture</h2>
            <p className="mt-0.5 text-sm text-[var(--afc-muted)]">
              JPEG, PNG ou WebP · 5 Mo au plus. Elle illustre l’article dans la liste du blog et sur l’accueil.
            </p>
            {article?.coverUrl ? (
              <div className="mt-4 space-y-3">
                <img
                  src={article.coverUrl}
                  alt={coverAlt}
                  className="max-h-56 w-full rounded-[12px] border border-[var(--afc-border)] object-cover"
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--afc-text)]">
                    Description de l’image
                  </label>
                  <input
                    className="input-field"
                    value={coverAlt}
                    onChange={(e) => setCoverAlt(e.target.value)}
                    placeholder="Les deux équipes avant le coup d’envoi"
                  />
                  <p className="mt-1 text-xs text-[var(--afc-muted)]">
                    Lue à voix haute par les lecteurs d’écran, et affichée si l’image ne charge pas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => champCouverture.current?.click()}
                    className="afc-button-secondary"
                    disabled={occupe}
                  >
                    Remplacer l’image
                  </button>
                  <button
                    type="button"
                    onClick={retirerCouverture}
                    className="afc-button-ghost"
                    disabled={occupe}
                  >
                    Retirer l’image
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => champCouverture.current?.click()}
                className="afc-button-secondary mt-4 inline-flex items-center gap-2"
                disabled={occupe}
              >
                <ImageIcon size={16} strokeWidth={1.8} />
                Choisir une image
              </button>
            )}
            <input
              ref={champCouverture}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => deposerCouverture(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Corps de l'article */}
          <div className="card">
            <h2 className="font-serif text-lg text-[var(--afc-text)]">Article</h2>
            <div className="mt-3 flex flex-wrap gap-1.5 border-b border-[var(--afc-border)] pb-3">
              <BoutonOutil onClick={() => formater('formatBlock', 'h2')} titre="Titre de section">
                T1
              </BoutonOutil>
              <BoutonOutil onClick={() => formater('formatBlock', 'h3')} titre="Sous-titre">
                T2
              </BoutonOutil>
              <BoutonOutil onClick={() => formater('formatBlock', 'p')} titre="Paragraphe">
                ¶
              </BoutonOutil>
              <BoutonOutil onClick={() => formater('bold')} titre="Gras">
                <Bold size={15} strokeWidth={2} />
              </BoutonOutil>
              <BoutonOutil onClick={() => formater('italic')} titre="Italique">
                <Italic size={15} strokeWidth={2} />
              </BoutonOutil>
              <BoutonOutil onClick={() => formater('insertUnorderedList')} titre="Liste à puces">
                <List size={15} strokeWidth={2} />
              </BoutonOutil>
              <BoutonOutil onClick={() => formater('insertOrderedList')} titre="Liste numérotée">
                <ListOrdered size={15} strokeWidth={2} />
              </BoutonOutil>
              <BoutonOutil onClick={() => formater('formatBlock', 'blockquote')} titre="Citation">
                <Quote size={15} strokeWidth={2} />
              </BoutonOutil>
              <BoutonOutil onClick={poserLien} titre="Lien">
                <Link2 size={15} strokeWidth={2} />
              </BoutonOutil>
              <BoutonOutil onClick={() => champImage.current?.click()} titre="Insérer une image">
                <ImageIcon size={15} strokeWidth={2} />
              </BoutonOutil>
              <BoutonOutil onClick={() => formater('removeFormat')} titre="Enlever la mise en forme">
                ∅
              </BoutonOutil>
            </div>
            <div
              ref={corps}
              contentEditable
              suppressContentEditableWarning
              data-invite="Écrivez l’article ici…"
              className="afc-prose afc-editeur mt-4 min-h-[320px] rounded-[10px] px-1 py-1"
            />
            <input
              ref={champImage}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => insererImage(e.target.files?.[0] ?? null)}
            />
            <p className="mt-3 text-xs text-[var(--afc-muted)]">
              Titres, gras, italique, listes, liens et images. Tout le reste — couleurs, polices, mises en forme
              collées depuis un traitement de texte — est retiré à l’enregistrement : le site garde une mise en
              page unique.
            </p>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={enregistrer} disabled={occupe} className="afc-button-secondary">
                {occupe ? 'Enregistrement…' : 'Enregistrer le brouillon'}
              </button>
              {article?.publicationStatus !== 'PUBLISHED' && (
                <button
                  type="button"
                  onClick={() => changerStatut('PUBLISHED')}
                  disabled={occupe}
                  className="btn-primary"
                >
                  {parution && new Date(parution) > new Date() ? 'Programmer la parution' : 'Publier sur le site'}
                </button>
              )}
              {article?.publicationStatus === 'PUBLISHED' && (
                <button
                  type="button"
                  onClick={() => changerStatut('DRAFT')}
                  disabled={occupe}
                  className="afc-button-secondary"
                >
                  Retirer de la publication
                </button>
              )}
              {article && article.publicationStatus !== 'ARCHIVED' && (
                <button
                  type="button"
                  onClick={() => changerStatut('ARCHIVED')}
                  disabled={occupe}
                  className="afc-button-ghost"
                >
                  Archiver
                </button>
              )}
              {article && (
                <button
                  type="button"
                  onClick={() => setASupprimer(true)}
                  disabled={occupe}
                  className="afc-button-ghost ml-auto inline-flex items-center gap-2 text-[var(--destructive)]"
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                  Supprimer
                </button>
              )}
            </div>
            {article?.slug && (
              <p className="afc-mono mt-3 text-xs text-[var(--afc-muted)]">
                Adresse sur le site : /blog/{article.slug}
              </p>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        open={aSupprimer}
        title="Supprimer cet article ?"
        message={
          article?.publicationStatus === 'PUBLISHED'
            ? `« ${article.title} » est publié : il disparaîtra du site à la reconstruction suivante. Cette suppression est définitive.`
            : `« ${article?.title ?? ''} » sera supprimé définitivement.`
        }
        confirmLabel="Supprimer"
        danger
        loading={occupe}
        onConfirm={supprimer}
        onCancel={() => setASupprimer(false)}
      />
    </div>
  );
}

/** Bouton de la barre d'outils : même dessin pour les icônes et les abréviations. */
function BoutonOutil({
  onClick,
  titre,
  children,
}: {
  onClick: () => void;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={titre}
      aria-label={titre}
      className="grid h-8 min-w-8 place-items-center rounded-[8px] border border-[var(--afc-border)] px-2 text-sm text-[var(--afc-text)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
    >
      {children}
    </button>
  );
}

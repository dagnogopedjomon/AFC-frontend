'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Camera } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { getCroppedImg, type PixelCrop } from '@/lib/crop';

/** Images acceptées et limite de taille, comme pour les albums (section 9). */
const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX = 5 * 1024 * 1024;

/** Une adresse relative renvoyée par le serveur doit être complétée pour s'afficher. */
export function adressePhoto(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base = API_BASE.replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Dépôt d'un portrait : choix du fichier, recadrage carré, envoi.
 *
 * Le même bloc sert au membre pour sa propre photo et au bureau pour celle
 * d'un autre ; seule la fonction d'envoi change. Le recadrage est imposé
 * parce que le site et l'application affichent le portrait en rond : sans
 * lui, une photo en largeur arrive décapitée.
 */
export function PhotoDeProfil({
  url,
  nom,
  envoyer,
  modifiable = true,
  taille = 'h-24 w-24',
  libelle = 'Changer la photo',
}: {
  url: string | null | undefined;
  nom: string;
  envoyer: (image: Blob) => Promise<void>;
  modifiable?: boolean;
  taille?: string;
  libelle?: string;
}) {
  const [source, setSource] = useState<string | null>(null);
  const [cadre, setCadre] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [zonePixels, setZonePixels] = useState<PixelCrop | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [imageCassee, setImageCassee] = useState(false);

  const affichee = adressePhoto(url);
  const initiales = nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('');

  const choisir = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      setErreur('Formats acceptés : JPEG, PNG ou WebP.');
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      setErreur('La photo ne doit pas dépasser 5 Mo.');
      return;
    }
    setErreur(null);
    setImageCassee(false);
    setSource(URL.createObjectURL(fichier));
    setZonePixels(null);
    setCadre({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const fermer = useCallback(() => {
    if (source) URL.revokeObjectURL(source);
    setSource(null);
    setZonePixels(null);
  }, [source]);

  const valider = useCallback(async () => {
    if (!source || !zonePixels) return;
    setEnvoiEnCours(true);
    try {
      await envoyer(await getCroppedImg(source, zonePixels));
      setImageCassee(false);
      fermer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setEnvoiEnCours(false);
    }
  }, [source, zonePixels, envoyer, fermer]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {affichee && !imageCassee ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={affichee}
            src={affichee}
            alt={`Portrait de ${nom}`}
            onError={() => setImageCassee(true)}
            className={`${taille} shrink-0 rounded-full border border-[var(--afc-border)] bg-[var(--secondary)] object-cover object-center`}
          />
        ) : (
          <div
            className={`${taille} grid shrink-0 place-items-center rounded-full border border-dashed border-[var(--afc-border)] bg-[var(--secondary)] text-lg font-semibold text-[var(--afc-muted)]`}
          >
            {initiales || <Camera size={18} strokeWidth={1.6} />}
          </div>
        )}

        {modifiable && (
          <div>
            <label className="afc-button-secondary inline-flex cursor-pointer items-center gap-2">
              <Camera size={16} strokeWidth={1.8} />
              {affichee && !imageCassee ? libelle : 'Ajouter une photo'}
              <input type="file" accept="image/*" className="sr-only" onChange={choisir} />
            </label>
            <p className="afc-mono mt-2 text-xs text-[var(--afc-muted)]">
              JPEG, PNG ou WebP · 5 Mo au plus
            </p>
          </div>
        )}
      </div>

      {erreur && <p className="mt-2 text-sm text-[var(--destructive)]">{erreur}</p>}

      {/* Recadrage : plein écran, pour viser juste même au téléphone. */}
      {source && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="relative min-h-0 flex-1">
            <Cropper
              image={source}
              crop={cadre}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              onCropChange={setCadre}
              onZoomChange={setZoom}
              onCropComplete={(_zone: Area, pixels: Area) => setZonePixels(pixels as PixelCrop)}
              style={{ containerStyle: { backgroundColor: '#000' } }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--afc-card)] p-4">
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              aria-label="Agrandir ou réduire"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="max-w-xs flex-1"
            />
            <div className="flex gap-2">
              <button type="button" onClick={fermer} className="afc-button-ghost">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void valider()}
                disabled={envoiEnCours || !zonePixels}
                className="btn-primary disabled:opacity-60"
              >
                {envoiEnCours ? 'Envoi…' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

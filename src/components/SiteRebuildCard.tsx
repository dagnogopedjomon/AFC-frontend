'use client';

import { useCallback, useEffect, useState } from 'react';
import { Globe, RefreshCw } from 'lucide-react';
import { siteApi, type EtatReconstruction } from '@/lib/api';

const dateHeure = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const ISSUE: Record<NonNullable<EtatReconstruction['derniereIssue']>, string> = {
  acceptee: 'acceptée',
  refusee: 'refusée',
  injoignable: 'sans réponse',
};

/**
 * Carte « Site public » commune aux écrans Événements, Documents et Articles
 * (lot 4 du module Publications).
 *
 * Elle dit ce que le site montre, si la reconstruction automatique est
 * branchée, et permet de la déclencher à la main. Sans cela, publier paraît
 * ne rien faire : le contenu est en base, mais le site garde l'état précédent.
 */
export function SiteRebuildCard({
  children,
  canEdit,
}: {
  children: React.ReactNode;
  canEdit: boolean;
}) {
  const [etat, setEtat] = useState<EtatReconstruction | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const relire = useCallback(() => {
    siteApi
      .etatReconstruction()
      .then(setEtat)
      // L'état de la reconstruction n'est qu'une information : son absence ne doit rien casser.
      .catch(() => setEtat(null));
  }, []);

  useEffect(relire, [relire]);

  async function reconstruire() {
    setOccupe(true);
    setMessage(null);
    try {
      const apres = await siteApi.reconstruire();
      setEtat(apres);
      setMessage(
        apres.derniereIssue === 'acceptee'
          ? 'Demande envoyée. Le site est à jour dans quatre à cinq minutes.'
          : apres.derniereIssue === 'refusee'
            ? 'Demande refusée : le jeton d’accès est probablement expiré ou mal autorisé.'
            : 'Destination injoignable. Le site reste tel qu’il est.',
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Demande impossible');
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <Globe size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[var(--primary)]" />
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg text-[var(--afc-text)]">Site public</h2>
          {children}

          {etat && !etat.configuree && (
            <p className="afc-badge-amber mt-3 rounded-[10px] border px-3 py-2 text-xs">
              La mise à jour automatique du site n’est pas branchée : un contenu publié reste invisible
              jusqu’au prochain dépôt. Il faut le lancer depuis l’onglet Actions de GitHub.
            </p>
          )}

          {etat?.configuree && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {canEdit && (
                <button
                  type="button"
                  onClick={reconstruire}
                  disabled={occupe}
                  className="afc-button-secondary inline-flex items-center gap-2"
                >
                  <RefreshCw
                    size={15}
                    strokeWidth={1.8}
                    className={occupe ? 'animate-spin' : undefined}
                  />
                  {occupe ? 'Demande en cours…' : 'Mettre le site à jour maintenant'}
                </button>
              )}
              {etat.derniereDemande && (
                <span className="afc-mono text-xs text-[var(--afc-muted)]">
                  Dernière mise à jour demandée le {dateHeure.format(new Date(etat.derniereDemande))}
                  {etat.derniereIssue && ` · ${ISSUE[etat.derniereIssue]}`}
                </span>
              )}
            </div>
          )}

          {message && <p className="mt-2 text-xs text-[var(--afc-muted)]">{message}</p>}
        </div>
      </div>
    </div>
  );
}

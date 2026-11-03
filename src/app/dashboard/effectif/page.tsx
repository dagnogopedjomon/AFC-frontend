'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { effectifApi, type FicheEffectif } from '@/lib/api';
import { SiteRebuildCard } from '@/components/SiteRebuildCard';

const CAN_EDIT = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

/** Les trois rangées de l'écran « L'effectif » du site, dans l'ordre d'affichage. */
const GROUPES: { cle: FicheEffectif['groupe']; titre: string; aide: string }[] = [
  { cle: 'bureau', titre: 'Le bureau', aide: 'Postes des statuts du 11 février 2023.' },
  { cle: 'commissaire', titre: 'Les commissaires aux comptes', aide: 'Élus par l’Assemblée générale pour un an.' },
  { cle: 'membre', titre: 'Les membres', aide: 'Leur poste sur le terrain, s’il est renseigné.' },
];

export default function EffectifPage() {
  const { user } = useAuth();
  const canEdit = !!user && CAN_EDIT.includes(user.role);

  const [fiches, setFiches] = useState<FicheEffectif[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  async function charger() {
    try {
      setFiches(await effectifApi.liste());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    void charger();
  }, []);

  async function basculer(fiche: FicheEffectif) {
    if (!canEdit) return;
    setEnCours(fiche.id);
    try {
      await effectifApi.accord(fiche.id, !fiche.accord, fiche.ordre);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setEnCours(null);
    }
  }

  const parus = useMemo(() => fiches.filter((f) => f.accord).length, [fiches]);

  return (
    <div className="fade-in space-y-6">
      {erreur && <div className="afc-badge-red rounded-[10px] border px-4 py-3 text-sm">{erreur}</div>}

      <SiteRebuildCard canEdit={canEdit}>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">
          Le site présente l’effectif en écussons sur l’accueil. Une personne n’y figure qu’avec son accord :
          c’est son nom et sa photo qui paraissent. Retirer l’accord la fait disparaître à la mise à jour
          suivante. Un poste du bureau sans personne affiche simplement son intitulé.
        </p>
        <p className="afc-mono mt-2 text-xs text-[var(--afc-muted)]">
          {parus} sur le site · {fiches.length} au total
        </p>
      </SiteRebuildCard>

      {chargement ? (
        <div className="card p-6 text-sm text-[var(--afc-muted)]">Chargement…</div>
      ) : (
        GROUPES.map((groupe) => {
          const lot = fiches.filter((f) => f.groupe === groupe.cle);
          if (lot.length === 0) return null;
          return (
            <section key={groupe.cle} className="card p-5">
              <div className="mb-4">
                <p className="afc-eyebrow">{groupe.titre}</p>
                <p className="mt-1 text-sm text-[var(--afc-muted)]">{groupe.aide}</p>
              </div>
              <ul className="divide-y divide-[var(--afc-border)]">
                {lot.map((fiche) => (
                  <li key={fiche.id} className="flex items-center gap-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--afc-border)] bg-[var(--secondary)]">
                      {fiche.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fiche.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Users className="h-4 w-4 text-[var(--afc-muted)]" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {fiche.prenom} {fiche.nom}
                      </span>
                      <span className="afc-mono block truncate text-xs text-[var(--afc-muted)]">
                        {fiche.poste || 'Aucun poste'}
                        {!fiche.photo && ' · sans photo, un maillot sera affiché'}
                      </span>
                    </span>
                    <span className={fiche.accord ? 'afc-badge-emerald' : 'afc-badge-gray'}>
                      {fiche.accord ? 'Sur le site' : 'Pas sur le site'}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => void basculer(fiche)}
                        disabled={enCours === fiche.id}
                        className={fiche.accord ? 'afc-button-ghost' : 'afc-button-secondary'}
                      >
                        {enCours === fiche.id
                          ? '…'
                          : fiche.accord
                            ? 'Retirer du site'
                            : 'Publier sur le site'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <p className="text-xs text-[var(--afc-muted)]">
        Droit à l’image : ne publiez une personne que si elle vous a donné son accord. Chaque mise en ligne
        et chaque retrait sont inscrits au journal avec leur auteur.
      </p>
    </div>
  );
}

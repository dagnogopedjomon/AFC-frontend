'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';

export default function PaiementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/cotisations"
          className="text-[var(--sky-blue-dark)] hover:underline font-medium"
        >
          ← Cotisations
        </Link>
      </div>

      <div className="card border-l-4 border-l-sky-500 max-w-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <Info size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">
              Enregistrement des paiements
            </h1>
            <p className="text-gray-600 mt-2">
              L’admin ne saisit aucun paiement. C’est la plateforme qui enregistre les cotisations : chaque membre paie depuis son propre compte.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc list-inside">
              <li>
                <strong>Membre à jour</strong> : Cotisations → « Payer ma cotisation » (mois + montant, puis valider).
              </li>
              <li>
                <strong>Membre avec dette</strong> : après réactivation par l’admin, il est redirigé vers « Régulariser » et paie mois par mois jusqu’à être à jour.
              </li>
            </ul>
            <p className="text-gray-600 mt-4 text-sm">
              L’admin intervient uniquement pour réactiver le compte d’un membre suspendu (fiche membre ou liste des membres en retard). Ensuite, le membre se connecte et règle lui-même ses cotisations sur la plateforme.
            </p>
            <Link
              href="/dashboard/cotisations"
              className="inline-block mt-6 px-4 py-2 rounded-xl bg-[var(--sky-blue)] text-white text-sm font-medium hover:opacity-90"
            >
              Retour aux cotisations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

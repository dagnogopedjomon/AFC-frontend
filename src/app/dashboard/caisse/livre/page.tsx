'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { caisseApi, contributionsApi, type LivreEntry, type Payment } from '@/lib/api';

const CAISSE_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];

export default function LivreDeCaissePage() {
  const { user } = useAuth();
  const [livre, setLivre] = useState<LivreEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [livreLimit, setLivreLimit] = useState(100);
  const [paymentsLimit, setPaymentsLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = user && CAISSE_ROLES.includes(user.role);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      caisseApi.livre(livreLimit),
      contributionsApi.payments({ limit: paymentsLimit }),
    ])
      .then(([l, p]) => {
        setLivre(l);
        setPayments(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [user, livreLimit, paymentsLimit]);

  if (!canAccess) {
    return (
      <div className="card py-12 text-center text-gray-500">
        Accès réservé au bureau.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Livre de caisse</h1>
        <p className="text-gray-500 text-sm mt-1">
          Historique unifié : cotisations, allocations vers sous-caisses, dépenses et retraits.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* Livre de caisse */}
      <section className="card overflow-hidden p-0">
        <h2 className="px-6 py-4 text-lg font-semibold text-[var(--foreground)] border-b border-gray-100">
          Mouvements
        </h2>
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white border-b border-gray-100">
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">Type</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Libellé / Bénéficiaire</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
              </tr>
            </thead>
            <tbody>
              {livre.map((entry) => (
                <tr key={`${entry.type}-${entry.id}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-gray-600 text-sm whitespace-nowrap">
                    {new Date(entry.date).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={
                        entry.type === 'entree'
                          ? 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800'
                          : 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-100 text-rose-800'
                      }
                    >
                      {entry.type === 'entree' ? 'Entrée' : 'Sortie'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[var(--foreground)]">
                    {entry.type === 'entree' ? (
                      <>
                        {entry.label}
                        {entry.periodYear != null && entry.periodMonth != null && (
                          <span className="text-gray-500 text-sm ml-1">
                            ({new Date(entry.periodYear, entry.periodMonth - 1).toLocaleString('fr-FR', {
                              month: 'long',
                              year: 'numeric',
                            })})
                          </span>
                        )}
                        {entry.kind === 'allocation' && entry.description && (
                          <span className="block text-sm text-gray-600 mt-0.5">{entry.description}</span>
                        )}
                      </>
                    ) : (
                      <>
                        {entry.label ?? entry.description ?? '—'}
                        {entry.beneficiary && (
                          <span className="block text-sm text-gray-600 mt-0.5">Bénéficiaire : {entry.beneficiary}</span>
                        )}
                        {entry.kind === 'withdrawal' && entry.description && (
                          <span className="block text-sm text-gray-600 mt-0.5">{entry.description}</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className={`px-6 py-3 font-medium ${entry.type === 'entree' ? 'text-green-700' : 'text-red-700'}`}>
                    {entry.type === 'entree' ? '+' : '−'}
                    {entry.amount.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {livre.length === 0 && (
          <div className="py-8 text-center text-gray-500 text-sm">Aucun mouvement enregistré.</div>
        )}
        {livre.length > 0 && livre.length >= livreLimit && (
          <div className="px-6 py-3 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => setLivreLimit((n) => n + 100)}
              className="text-sm text-[var(--sky-blue)] hover:underline font-medium"
            >
              Charger plus de mouvements
            </button>
          </div>
        )}
      </section>

      {/* Entrées récentes */}
      <div className="card overflow-hidden p-0">
        <h2 className="px-6 py-4 text-lg font-semibold text-[var(--foreground)] border-b border-gray-100">
          Entrées récentes
        </h2>
        <p className="px-6 py-2 text-sm text-gray-500 border-b border-gray-50">
          Derniers paiements de cotisations enregistrés.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-emerald-50/80">
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">Membre</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Cotisation</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Période</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Date paiement</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-medium text-[var(--foreground)]">
                    {p.member ? `${p.member.firstName} ${p.member.lastName}` : `Membre ${p.memberId}`}
                  </td>
                  <td className="px-6 py-3 text-gray-600 text-sm">{p.contribution?.name ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600 text-sm">
                    {p.periodYear != null && p.periodMonth != null
                      ? new Date(p.periodYear, p.periodMonth - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-6 py-3 text-green-700 font-medium">
                    {Number(p.amount).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-3 text-gray-600 text-sm">
                    {new Date(p.paidAt).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && (
          <div className="py-8 text-center text-gray-500 text-sm">Aucun paiement enregistré.</div>
        )}
        {payments.length > 0 && payments.length >= paymentsLimit && (
          <div className="px-6 py-3 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => setPaymentsLimit((n) => n + 50)}
              className="text-sm text-[var(--sky-blue)] hover:underline font-medium"
            >
              Charger plus de paiements
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

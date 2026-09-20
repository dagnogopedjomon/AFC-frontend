'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { caisseApi, contributionsApi, type LivreEntry, type Payment } from '@/lib/api';
import { CaisseMembre } from '@/components/CaisseMembre';

const BUREAU_OR_ADMIN = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

export default function LivreDeCaissePage() {
  const { user } = useAuth();
  if (!user) return null;
  return BUREAU_OR_ADMIN.includes(user.role) ? <LivreBureau /> : <CaisseMembre />;
}

function LivreBureau() {
  const { user } = useAuth();
  const [livre, setLivre] = useState<LivreEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [livreLimit, setLivreLimit] = useState(100);
  const [paymentsLimit, setPaymentsLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = !!user;

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
      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12 text-center text-[var(--afc-muted)]">
        Accès réservé au bureau.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Livre de caisse</h1>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">
            Historique unifié : cotisations, allocations vers sous-caisses, dépenses et retraits.
          </p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--afc-muted-3)]">Journal des mouvements</p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Livre de caisse */}
      <section className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <h2 className="border-b border-[var(--afc-border)] px-6 py-4 text-lg font-semibold text-[var(--afc-text)]">
          Mouvements
        </h2>
        <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
          <table className="afc-table-dark w-full text-left">
            <thead className="sticky top-0 z-10 bg-[var(--afc-card)]">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Type</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Libellé / Bénéficiaire</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
              </tr>
            </thead>
            <tbody>
              {livre.map((entry) => (
                <tr key={`${entry.type}-${entry.id}`} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                  <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--afc-muted-2)]">
                    {new Date(entry.date).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.type === 'entree' ? 'border border-emerald-700/30 bg-emerald-900/20 text-emerald-400' : 'border border-red-700/30 bg-red-900/20 text-red-400'}`}>
                      {entry.type === 'entree' ? 'Entrée' : 'Sortie'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[var(--afc-text)]">
                    {entry.type === 'entree' ? (
                      <>
                        {entry.label}
                        {entry.periodYear != null && entry.periodMonth != null && (
                          <span className="ml-1 text-sm text-[var(--afc-muted)]">
                            ({new Date(entry.periodYear, entry.periodMonth - 1).toLocaleString('fr-FR', {
                              month: 'long',
                              year: 'numeric',
                            })})
                          </span>
                        )}
                        {entry.kind === 'allocation' && entry.description && (
                          <span className="mt-0.5 block text-sm text-[var(--afc-muted-2)]">{entry.description}</span>
                        )}
                      </>
                    ) : (
                      <>
                        {entry.label ?? entry.description ?? '—'}
                        {entry.beneficiary && (
                          <span className="mt-0.5 block text-sm text-[var(--afc-muted-2)]">Bénéficiaire : {entry.beneficiary}</span>
                        )}
                        {entry.kind === 'withdrawal' && entry.description && (
                          <span className="mt-0.5 block text-sm text-[var(--afc-muted-2)]">{entry.description}</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className={`px-6 py-3 text-right font-semibold ${entry.type === 'entree' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {entry.type === 'entree' ? '+' : '−'}
                    {entry.amount.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {livre.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--afc-muted)]">Aucun mouvement enregistré.</div>
        )}
        {livre.length > 0 && livre.length >= livreLimit && (
          <div className="border-t border-[var(--afc-border)] px-6 py-3 text-center">
            <button
              type="button"
              onClick={() => setLivreLimit((n) => n + 100)}
              className="text-sm font-medium text-[#C9A048] transition hover:text-[#DDB65C] hover:underline"
            >
              Charger plus de mouvements
            </button>
          </div>
        )}
      </section>

      {/* Entrées récentes */}
      <div className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <h2 className="border-b border-[var(--afc-border)] px-6 py-4 text-lg font-semibold text-[var(--afc-text)]">
          Entrées récentes
        </h2>
        <p className="border-b border-[rgba(var(--afc-hl),0.04)] px-6 py-2 text-sm text-[var(--afc-muted)]">
          Derniers paiements de cotisations enregistrés.
        </p>
        <div className="max-h-[520px] overflow-auto">
          <table className="afc-table-dark w-full text-left">
            <thead className="sticky top-0 z-10 bg-[var(--afc-card)]">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Membre</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Cotisation</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Période</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date paiement</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                  <td className="px-6 py-3 font-medium text-[var(--afc-text)]">
                    {p.member ? `${p.member.firstName} ${p.member.lastName}` : `Membre ${p.memberId}`}
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--afc-muted-2)]">{p.contribution?.name ?? '—'}</td>
                  <td className="px-6 py-3 text-sm text-[var(--afc-muted-2)]">
                    {p.periodYear != null && p.periodMonth != null
                      ? new Date(p.periodYear, p.periodMonth - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-6 py-3 font-medium text-emerald-400">
                    {Number(p.amount).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--afc-muted-2)]">
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
          <div className="py-8 text-center text-sm text-[var(--afc-muted)]">Aucun paiement enregistré.</div>
        )}
        {payments.length > 0 && payments.length >= paymentsLimit && (
          <div className="border-t border-[var(--afc-border)] px-6 py-3 text-center">
            <button
              type="button"
              onClick={() => setPaymentsLimit((n) => n + 50)}
              className="text-sm font-medium text-[#C9A048] transition hover:text-[#DDB65C] hover:underline"
            >
              Charger plus de paiements
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

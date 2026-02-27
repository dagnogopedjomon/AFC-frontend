'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, membersApi, type HistorySummary, type MemberHistory, type Member, type Payment } from '@/lib/api';

export default function HistoriquePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberHistory, setMemberHistory] = useState<MemberHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => {
      const member = p.member;
      if (!member) return false;
      const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.toLowerCase();
      const phone = (member.phone ?? '').toLowerCase();
      return fullName.includes(q) || phone.includes(q);
    });
  }, [payments, searchQuery]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    contributionsApi
      .historySummary()
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
    membersApi.list().then(setMembers).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setPaymentsLoading(true);
    contributionsApi
      .payments({ limit: 500 })
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedMemberId) {
      setMemberHistory(null);
      return;
    }
    contributionsApi
      .memberHistory(selectedMemberId)
      .then(setMemberHistory)
      .catch(() => setMemberHistory(null));
  }, [selectedMemberId]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cotisations" className="text-[var(--sky-blue-dark)] hover:underline font-medium">
          ← Cotisations
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Historique & soldes</h1>
        <p className="text-gray-600 mt-1">Historique des cotisations, solde global et recherche pour tracer qui a payé.</p>
      </div>

      {/* Recherche des paiements — tracer qui a payé */}
      <div className="card">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Recherche des paiements</h2>
        <p className="text-sm text-gray-600 mb-4">
          Recherchez par nom ou numéro de téléphone pour voir tous les paiements d’un membre.
        </p>
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Nom ou téléphone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full pl-10"
          />
        </div>
        {paymentsLoading ? (
          <div className="py-8 flex justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[var(--sky-blue-soft)]">
                  <th className="px-4 py-3 text-[var(--sky-blue-dark)]">Date</th>
                  <th className="px-4 py-3 text-gray-600">Membre</th>
                  <th className="px-4 py-3 text-gray-600">Téléphone</th>
                  <th className="px-4 py-3 text-gray-600">Cotisation</th>
                  <th className="px-4 py-3 text-gray-600">Montant</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      {payments.length === 0 ? 'Aucun paiement enregistré.' : 'Aucun résultat pour cette recherche.'}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(p.paidAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {p.member ? `${p.member.firstName} ${p.member.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.member?.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.contribution?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-medium">{Number(p.amount).toLocaleString('fr-FR')} FCFA</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {filteredPayments.length > 0 && (
          <p className="mt-3 text-xs text-gray-500">
            {filteredPayments.length} paiement{filteredPayments.length !== 1 ? 's' : ''} affiché{searchQuery.trim() ? ' (filtré)' : ''}.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="card flex justify-center py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
        </div>
      ) : (
        <>
          {summary && (
            <div className="card">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Solde global (cotisation mensuelle)</h2>
              <p className="text-2xl font-bold text-[var(--sky-blue-dark)]">
                {summary.totalCollected.toLocaleString('fr-FR')} FCFA
              </p>
              <p className="text-sm text-gray-500 mt-1">Total collecté (toutes périodes)</p>
              {summary.byMonth.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Par mois</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-2 text-gray-600">Période</th>
                          <th className="py-2 text-gray-600">Collecté</th>
                          <th className="py-2 text-gray-600">Paiements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.byMonth.slice(0, 12).map((m) => (
                          <tr key={`${m.year}-${m.month}`} className="border-b border-gray-50">
                            <td className="py-2">
                              {new Date(m.year, m.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                            </td>
                            <td className="py-2 font-medium">{m.totalCollected.toLocaleString('fr-FR')} FCFA</td>
                            <td className="py-2 text-gray-600">{m.paymentsCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Historique par membre</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Choisir un membre</label>
              <select
                className="input-field max-w-md"
                value={selectedMemberId ?? ''}
                onChange={(e) => setSelectedMemberId(e.target.value || null)}
              >
                <option value="">— Choisir —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} — {m.phone}
                  </option>
                ))}
              </select>
            </div>
            {memberHistory && (
              <div className="mt-4 space-y-4">
                <p className="font-medium text-[var(--foreground)]">
                  {memberHistory.member.firstName} {memberHistory.member.lastName} — Total payé :{' '}
                  {memberHistory.totalPaid.toLocaleString('fr-FR')} FCFA
                </p>
                {memberHistory.byMonth.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-[var(--sky-blue-soft)]">
                          <th className="px-4 py-2 text-[var(--sky-blue-dark)]">Période</th>
                          <th className="px-4 py-2 text-gray-600">Montant</th>
                          <th className="px-4 py-2 text-gray-600">Date paiement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberHistory.byMonth.map((m, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="px-4 py-2">
                              {new Date(m.year, m.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-2">{m.amount.toLocaleString('fr-FR')} FCFA</td>
                            <td className="px-4 py-2 text-gray-600">
                              {new Date(m.paidAt).toLocaleDateString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {memberHistory.byMonth.length === 0 && (
                  <p className="text-gray-500">Aucun paiement de cotisation mensuelle pour ce membre.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

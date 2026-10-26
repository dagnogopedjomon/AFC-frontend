'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { reportsApi, type MonthlyReport, type AnnualReport } from '@/lib/api';

const ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];

export default function RapportsPage() {
  const { user } = useAuth();
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [annual, setAnnual] = useState<AnnualReport | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = user && ROLES.includes(user.role);

  useEffect(() => {
    if (!canAccess) return;
    setLoading(true);
    Promise.all([reportsApi.monthly(year, month), reportsApi.annual(year)])
      .then(([m, a]) => {
        setMonthly(m);
        setAnnual(a);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [canAccess, year, month]);

  if (!canAccess) {
    return (
      <div className="card">
        <Link href="/dashboard" className="mt-4 inline-block text-[var(--sky-blue-dark)] hover:underline">
          ← Tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <div className="flex gap-2 items-center">
          <select
            className="input-field w-auto"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {[year - 2, year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="input-field w-auto"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString('fr-FR', { month: 'long' })}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => reportsApi.downloadExcel(year, month)}
            className="btn-primary text-sm"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => reportsApi.downloadPdf(year, month)}
            className="rounded-xl border border-[var(--sky-blue)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--sky-blue-dark)] hover:bg-[var(--sky-blue-soft)]"
          >
            Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-[var(--afc-badge-red-bg)] text-[var(--destructive)] px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="card flex justify-center py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
        </div>
      ) : (
        <>
          {monthly && (
            <div className="card">
              <h2 className="font-serif text-lg text-[var(--foreground)] mb-4">
                Rapport mensuel — {monthly.period.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                <div>
                  <p className="text-sm text-[var(--afc-muted)]">Entrées</p>
                  <p className="afc-figure text-[26px] text-[var(--primary)]">
                    {monthly.totalEntries.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--afc-muted)]">Sorties</p>
                  <p className="afc-figure text-[26px] text-[var(--destructive)]">
                    {monthly.totalExits.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--afc-muted)]">Solde</p>
                  <p className="afc-figure text-[26px] text-[var(--sky-blue-dark)]">
                    {monthly.solde.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
              <p className="text-sm text-[var(--afc-muted)]">
                {monthly.payments.length} paiement(s), {monthly.expenses.length} dépense(s) approuvée(s).
              </p>
            </div>
          )}

          {annual && (
            <div className="card">
              <h2 className="font-serif text-lg text-[var(--foreground)] mb-4">
                Rapport annuel — {annual.year}
              </h2>
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                <div>
                  <p className="text-sm text-[var(--afc-muted)]">Total encaissé dans la caisse</p>
                  <p className="afc-figure text-[26px] text-[var(--primary)]">
                    {annual.totalEntries.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--afc-muted)]">Total sorties</p>
                  <p className="afc-figure text-[26px] text-[var(--destructive)]">
                    {annual.totalExits.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--afc-muted)]">Solde</p>
                  <p className="afc-figure text-[26px] text-[var(--sky-blue-dark)]">
                    {annual.solde.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--afc-border)] bg-[var(--sky-blue-soft)]">
                      <th className="px-4 py-2 text-left text-[var(--sky-blue-dark)]">Mois</th>
                      <th className="px-4 py-2 text-left text-[var(--afc-muted)]">Entrées</th>
                      <th className="px-4 py-2 text-left text-[var(--afc-muted)]">Sorties</th>
                      <th className="px-4 py-2 text-left text-[var(--afc-muted)]">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annual.months.map((m) => (
                      <tr key={`${m.year}-${m.month}`} className="border-b border-[var(--afc-border)]">
                        <td className="px-4 py-2">{m.label}</td>
                        <td className="px-4 py-2">{m.totalEntries.toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-2">{m.totalExits.toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-2 font-medium">{m.solde.toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

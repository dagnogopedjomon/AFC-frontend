'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { administrationApi, type Fine } from '@/lib/api';

const statusLabel: Record<string, string> = { UNPAID: 'À régler', PAID: 'Réglée', CANCELLED: 'Annulée' };
const statusTone: Record<string, string> = {
  PAID: 'afc-badge-blue border',
  CANCELLED: 'afc-badge-gray border',
  UNPAID: 'afc-badge-amber border',
};
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function MesAmendesPage() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    administrationApi
      .myFines()
      .then(setFines)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => fines.filter((f) => statusFilter === 'ALL' || f.status === statusFilter),
    [fines, statusFilter],
  );

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Mes amendes</h1>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Suivi de vos pénalités et de leurs règlements.</p>
      </header>

      <section className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <div className="flex flex-wrap gap-2 p-4">
          <select aria-label="Filtrer par statut" className="afc-login-input w-full text-sm sm:w-auto sm:min-w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Tous les statuts</option>
            <option value="UNPAID">À régler</option>
            <option value="PAID">Réglées</option>
            <option value="CANCELLED">Annulées</option>
          </select>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
          </div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {visible.map((fine) => (
                <article key={fine.id} className="rounded-xl border border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-[var(--afc-muted)]">{date(fine.createdAt)}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[fine.status]}`}>
                      {statusLabel[fine.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--afc-border)] pt-3">
                    <span className="text-sm text-[var(--afc-muted)]">{fine.reason}</span>
                    <strong className="text-[var(--afc-text)]">{Number(fine.amount).toLocaleString('fr-FR')} F</strong>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="afc-table-dark w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Motif</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Montant</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Réglée le</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((fine) => (
                    <tr key={fine.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                      <td className="px-5 py-3 text-[var(--afc-muted-2)]">{date(fine.createdAt)}</td>
                      <td className="px-5 py-3 text-[var(--afc-muted-2)]">{fine.reason}</td>
                      <td className="px-5 py-3 font-medium text-[var(--afc-text)]">{Number(fine.amount).toLocaleString('fr-FR')} F</td>
                      <td className="px-5 py-3 text-[var(--afc-muted-2)]">{date(fine.paidAt)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[fine.status]}`}>
                          {statusLabel[fine.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visible.length === 0 && <p className="p-10 text-center text-[var(--afc-muted)]">Aucune amende à votre nom.</p>}
          </>
        )}
      </section>
    </div>
  );
}

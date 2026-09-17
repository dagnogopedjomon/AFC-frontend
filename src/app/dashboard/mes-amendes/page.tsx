'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { administrationApi, type Fine } from '@/lib/api';

const statusLabel: Record<string, string> = { UNPAID: 'À régler', PAID: 'Réglée', CANCELLED: 'Annulée' };
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Mes amendes</h1>
        <p className="text-gray-600 mt-1">Suivi de vos pénalités et de leurs règlements.</p>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap gap-2 p-4">
          <select aria-label="Filtrer par statut" className="input-field w-full sm:w-auto sm:min-w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Tous les statuts</option>
            <option value="UNPAID">À régler</option>
            <option value="PAID">Réglées</option>
            <option value="CANCELLED">Annulées</option>
          </select>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
          </div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {visible.map((fine) => (
                <article key={fine.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-slate-500">{date(fine.createdAt)}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${fine.status === 'PAID' ? 'bg-blue-50 text-blue-700' : fine.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>
                      {statusLabel[fine.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-500">{fine.reason}</span>
                    <strong className="text-slate-800">{Number(fine.amount).toLocaleString('fr-FR')} F</strong>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Motif</th>
                    <th className="px-5 py-3">Montant</th>
                    <th className="px-5 py-3">Réglée le</th>
                    <th className="px-5 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((fine) => (
                    <tr key={fine.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 text-slate-500">{date(fine.createdAt)}</td>
                      <td className="px-5 py-3 text-slate-500">{fine.reason}</td>
                      <td className="px-5 py-3 font-medium">{Number(fine.amount).toLocaleString('fr-FR')} F</td>
                      <td className="px-5 py-3 text-slate-500">{date(fine.paidAt)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${fine.status === 'PAID' ? 'bg-blue-50 text-blue-700' : fine.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>
                          {statusLabel[fine.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visible.length === 0 && <p className="p-10 text-center text-gray-500">Aucune amende à votre nom.</p>}
          </>
        )}
      </section>
    </div>
  );
}

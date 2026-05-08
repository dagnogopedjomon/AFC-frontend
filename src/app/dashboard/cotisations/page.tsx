'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/lib/auth-context';
import {
  contributionsApi,
  membersApi,
  type Contribution,
  type ArrearsResult,
  type MemberHistory,
  type HistorySummary,
} from '@/lib/api';
import { CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { toast } from 'sonner';

const COTISATIONS_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];
const CHART_COLORS = { upToDate: 'var(--sky-blue)', arrears: '#f59e0b' };
const CAN_RECORD = ['ADMIN', 'TREASURER'];

export default function CotisationsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [monthly, setMonthly] = useState<Contribution | null>(null);
  const [monthlyForSelf, setMonthlyForSelf] = useState<Contribution | null>(null);
  const [arrears, setArrears] = useState<ArrearsResult | null>(null);
  const [myStatus, setMyStatus] = useState<MemberHistory | null>(null);
  const [myStatusLoading, setMyStatusLoading] = useState(true);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [reactivateModalMember, setReactivateModalMember] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selfPaymentError, setSelfPaymentError] = useState<string | null>(null);
  const [unpaidMonthsForSelf, setUnpaidMonthsForSelf] = useState<Array<{ year: number; month: number }>>([]);
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(null);
  const [allContributions, setAllContributions] = useState<Contribution[]>([]);
  const paid = searchParams.get('paid') === '1';

  const openExceptionalContributions = allContributions.filter(
    (c) => c.type === 'EXCEPTIONAL' && (!c.endDate || new Date(c.endDate) >= new Date()),
  );

  const canAct = user && COTISATIONS_ROLES.includes(user.role);
  const canRecord = user && CAN_RECORD.includes(user.role);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!user) return;
    contributionsApi
      .monthly()
      .then(setMonthly)
      .catch(() => setError('Cotisation mensuelle introuvable'));
    contributionsApi
      .arrears()
      .then(setArrears)
      .catch(() => setArrears({ periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, members: [], total: 0 }));
    if (canAct) {
      membersApi.list().then((list) => setTotalMembers(list.length)).catch(() => setTotalMembers(null));
      contributionsApi.historySummary().then(setHistorySummary).catch(() => setHistorySummary(null));
    }
  }, [user, canAct]);

  useEffect(() => {
    if (!user) return;
    setMyStatusLoading(true);
    contributionsApi
      .me()
      .then((data) => {
        setMyStatus(data);
        setMyStatusLoading(false);
      })
      .catch(() => {
        setMyStatus(null);
        setMyStatusLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    contributionsApi.monthly().then(setMonthlyForSelf).catch(() => setMonthlyForSelf(null));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    contributionsApi.list().then(setAllContributions).catch(() => setAllContributions([]));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    contributionsApi.meUnpaidMonths().then((d) => setUnpaidMonthsForSelf(d.unpaidMonths)).catch(() => setUnpaidMonthsForSelf([]));
  }, [user, myStatus]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthLabel = new Date(currentYear, currentMonth - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
  const paidThisMonth = myStatus?.byMonth?.some((m) => m.year === currentYear && m.month === currentMonth) ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Cotisations</h1>
        <p className="text-gray-600 mt-1">
          {canAct ? 'Suivi des cotisations mensuelles, échéance le 10.' : 'Consultation en lecture seule — transparence : qui a cotisé, qui est en retard.'}
          {' '}
          <Link href="/dashboard/cotisations/historique" className="text-[var(--sky-blue-dark)] hover:underline font-medium">
            Historique et recherche des paiements →
          </Link>
        </p>
      </div>

      {user && (
        <div className="card border-l-4 border-l-[var(--sky-blue)]">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Mon statut</h2>
          {myStatusLoading ? (
            <p className="mt-2 text-gray-500">Chargement…</p>
          ) : myStatus ? (
            <>
              {myStatus.member.isSuspended && (
                <p className="mt-2 text-red-600 font-medium">
                  Votre compte est suspendu. Régularisez vos cotisations pour être réactivé.
                </p>
              )}
              {paidThisMonth ? (
                unpaidMonthsForSelf.length > 0 ? (
                  <p className="mt-2 text-amber-700 font-medium">
                    Vous avez réglé le mois en cours ({monthLabel}). Il vous reste toutefois <strong>{unpaidMonthsForSelf.length} mois passés</strong> à régler pour être entièrement à jour (voir la liste ci-dessous).
                  </p>
                ) : (
                  <p className="mt-2 text-green-700 font-medium">Vous êtes à jour pour {monthLabel}.</p>
                )
              ) : (
                <p className="mt-2 text-amber-700 font-medium">En retard pour {monthLabel}. Échéance le 10.</p>
              )}
              <p className="text-gray-600 mt-2 text-sm">
                Total versé : {Number(myStatus.totalPaid).toLocaleString('fr-FR')} FCFA
              </p>
              {myStatus.byMonth && myStatus.byMonth.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-sm text-gray-600">
                  {myStatus.byMonth.slice(0, 6).map((m) => (
                    <li key={`${m.year}-${m.month}`}>
                      {new Date(m.year, m.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}{' '}
                      — {m.amount.toLocaleString('fr-FR')} FCFA
                    </li>
                  ))}
                </ul>
              )}
              {monthlyForSelf && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <SelfPaymentForm
                    monthly={monthlyForSelf}
                    currentYear={currentYear}
                    currentMonth={currentMonth}
                    paidMonths={myStatus?.byMonth ?? []}
                    unpaidMonths={unpaidMonthsForSelf}
                    error={selfPaymentError}
                    onSuccess={() => {
                      setSelfPaymentError(null);
                      contributionsApi.me().then(setMyStatus).catch(() => {});
                      contributionsApi.meUnpaidMonths().then((d) => setUnpaidMonthsForSelf(d.unpaidMonths)).catch(() => setUnpaidMonthsForSelf([]));
                    }}
                    onError={setSelfPaymentError}
                  />
                </div>
              )}
              {!monthlyForSelf && !myStatusLoading && (
                <p className="mt-2 text-amber-600 text-sm">Cotisation mensuelle non configurée. Contactez l’admin.</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-gray-500">Impossible de charger votre statut.</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>
      )}
      {paid && (
        <div className="rounded-xl bg-green-50 text-green-800 px-4 py-3">
          Paiement enregistré. Le membre a été réactivé si c’était une cotisation mensuelle.
        </div>
      )}

      {monthly && (
        <div className="card border-l-4 border-l-[var(--sky-blue)]">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Cotisation mensuelle</h2>
          <p className="mt-2 text-xl font-semibold text-[var(--sky-blue-dark)]">{monthly.name}</p>
          <p className="text-gray-600 mt-1">
            {monthly.amount != null ? `${Number(monthly.amount).toLocaleString('fr-FR')} FCFA / mois` : '—'} · Échéance le 10
          </p>
        </div>
      )}

      {openExceptionalContributions.length > 0 && (
        <ExceptionalPaymentCard contributions={openExceptionalContributions} />
      )}

      {/* Graphiques cotisations — visible pour Admin / Trésorier / Commissaire */}
      {canAct && (() => {
        const cotisationChartData =
          arrears !== null && totalMembers != null && totalMembers > 0
            ? [
                { name: 'À jour', value: Math.max(0, totalMembers - arrears.total), color: CHART_COLORS.upToDate },
                { name: 'En retard', value: arrears.total, color: CHART_COLORS.arrears },
              ].filter((d) => d.value > 0)
            : [];
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            {cotisationChartData.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 pb-2 border-b border-slate-100">
                  Membres à jour / en retard
                </h2>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cotisationChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {cotisationChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) => [`${value ?? 0} membre(s)`, '']} />
                      <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0} membre${(entry?.payload?.value ?? 0) !== 1 ? 's' : ''})`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {historySummary?.byMonth?.length ? (
              <div className="card">
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 pb-2 border-b border-slate-100">
                  Cotisations collectées par mois
                </h2>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={historySummary.byMonth
                        .slice(-12)
                        .map((m) => ({
                          mois: new Date(m.year, m.month - 1).toLocaleString('fr-FR', { month: 'short', year: '2-digit' }),
                          total: m.totalCollected,
                          paiements: m.paymentsCount,
                        }))}
                      margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number | undefined) => [(value ?? 0).toLocaleString('fr-FR') + ' FCFA', 'Collecté']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.mois}
                      />
                      <Bar dataKey="total" name="Collecté" fill="var(--sky-blue)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </div>
        );
      })()}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Membres en retard — {monthLabel}
          </h2>
          <div className="flex gap-2">
            <Link
              href="/dashboard/cotisations/historique"
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              Historique & soldes
            </Link>
            {canRecord && (
              <Link
                href="/dashboard/cotisations/gerer"
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Gérer les cotisations
              </Link>
            )}
          </div>
        </div>
        {arrears && (
          <>
            <p className="text-gray-600 text-sm mb-1">
              {arrears.total} membre{arrears.total !== 1 ? 's' : ''} sans paiement pour ce mois.
            </p>
            <p className="text-slate-500 text-xs mb-4">
              Les suspensions sont appliquées automatiquement par l’application après le 10 de chaque mois (membres sans paiement du mois en cours).
            </p>
            {arrears.members.length === 0 ? (
              <p className="text-green-600 py-4">Tous les membres sont à jour.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-[var(--sky-blue-soft)]">
                      <th className="px-4 py-3 text-sm font-semibold text-[var(--sky-blue-dark)]">Membre</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Téléphone</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Statut</th>
                      {isAdmin && (
                        <th className="px-4 py-3 text-sm font-semibold text-gray-600">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {arrears.members.map((m) => (
                      <tr key={m.id} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                          <Link href={`/dashboard/membres/${m.id}`} className="text-[var(--sky-blue-dark)] hover:underline">
                            {m.firstName} {m.lastName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{m.phone}</td>
                        <td className="px-4 py-3">
                          {m.isSuspended ? (
                            <span className="text-red-600 text-sm font-medium">Suspendu</span>
                          ) : (
                            <span className="text-amber-600 text-sm">En retard</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            {m.isSuspended ? (
                              <button
                                type="button"
                                onClick={() => setReactivateModalMember({ id: m.id, firstName: m.firstName, lastName: m.lastName })}
                                disabled={reactivatingId === m.id}
                                className="cursor-pointer text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {reactivatingId === m.id ? '…' : 'Réactiver le compte'}
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={reactivateModalMember !== null}
        title="Réactiver le compte"
        message="Le membre pourra se connecter et devra régulariser ses cotisations."
        confirmLabel="OK"
        cancelLabel="Annuler"
        loading={reactivatingId !== null}
        onConfirm={() => {
          if (!reactivateModalMember) return;
          setReactivatingId(reactivateModalMember.id);
          setError(null);
          membersApi
            .update(reactivateModalMember.id, { isSuspended: false })
            .then(() => {
              toast.success('Compte réactivé.');
              return contributionsApi.arrears();
            })
            .then(setArrears)
            .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
            .finally(() => {
              setReactivatingId(null);
              setReactivateModalMember(null);
            });
        }}
        onCancel={() => setReactivateModalMember(null)}
      />
    </div>
  );
}

function ExceptionalPaymentCard({ contributions }: { contributions: Contribution[] }) {
  const [selectedId, setSelectedId] = useState<string>(contributions[0]?.id ?? '');
  const [jekoLoading, setJekoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = contributions.find((c) => c.id === selectedId);

  async function handleJekoPay() {
    if (!selected) return;
    setJekoLoading(true);
    setError(null);
    try {
      const res = await contributionsApi.jekoInit({
        contributionId: selected.id,
        amount: Number(selected.amount),
      });
      window.location.href = res.paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du paiement.');
    } finally {
      setJekoLoading(false);
    }
  }

  return (
    <div className="card border-l-4 border-l-amber-500">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Cotisations exceptionnelles (événements, etc.)</h2>
      <p className="text-gray-600 text-sm mb-4">
        Vous pouvez payer à tout moment et autant de fois que vous voulez, n&apos;importe quel montant. Une fois la date de fin passée, la cotisation est clôturée et reste dans l&apos;historique.
      </p>
      <ul className="space-y-2 mb-4">
        {contributions.map((c) => (
          <li key={c.id} className="text-sm text-[var(--foreground)]">
            <strong>{c.name}</strong>
            {c.amount != null && ` — ${Number(c.amount).toLocaleString('fr-FR')} FCFA`}
            {c.endDate && ` — clôture ${new Date(c.endDate).toLocaleDateString('fr-FR')}`}
          </li>
        ))}
      </ul>
      {contributions.length > 1 && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="input-field mb-3 w-full"
        >
          {contributions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.amount != null ? ` — ${Number(c.amount).toLocaleString('fr-FR')} FCFA` : ''}</option>
          ))}
        </select>
      )}
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleJekoPay}
          disabled={jekoLoading || !selected}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {jekoLoading ? (
            <><Loader2 size={18} className="animate-spin" /> Redirection…</>
          ) : (
            <><CreditCard size={18} /> Payer {selected?.amount != null ? `${Number(selected.amount).toLocaleString('fr-FR')} FCFA` : ''} en ligne</>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center">Wave · Orange Money · MTN · Moov · Djamo</p>
      </div>
    </div>
  );
}

function SelfPaymentForm({
  monthly,
  unpaidMonths,
  onSuccess,
  onError,
}: {
  monthly: Contribution;
  currentYear: number;
  currentMonth: number;
  paidMonths: Array<{ year: number; month: number }>;
  unpaidMonths: Array<{ year: number; month: number }>;
  error: string | null;
  onSuccess: () => void;
  onError: (msg: string | null) => void;
}) {
  const now = new Date();
  const isCurrentMonth = (y: number, m: number) => y === now.getFullYear() && m === now.getMonth() + 1;
  const [jekoLoading, setJekoLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const handleJekoPay = useCallback(async () => {
    if (!monthly.id || unpaidMonths.length === 0) return;
    setJekoLoading(true);
    onError(null);
    try {
      const firstUnpaid = unpaidMonths[0];
      const res = await contributionsApi.jekoInit({
        contributionId: monthly.id,
        amount: Number(monthly.amount),
        periodYear: firstUnpaid.year,
        periodMonth: firstUnpaid.month,
      });
      window.location.href = res.paymentUrl;
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Erreur lors du paiement.');
    } finally {
      setJekoLoading(false);
    }
  }, [monthly, unpaidMonths, onError]);

  return (
    <div className="card border-l-4 border-l-emerald-500">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Payer ma cotisation (mensuelle)</h2>
      <p className="text-gray-600 text-sm mb-2">
        Cotisation : <strong>{monthly.name}</strong>
        {monthly.amount != null && ` — ${Number(monthly.amount).toLocaleString('fr-FR')} FCFA / mois`}
      </p>
      {unpaidMonths.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <p className="font-semibold mb-1">Mois à régler ({unpaidMonths.length}) :</p>
          <ul className="list-disc list-inside space-y-0.5">
            {unpaidMonths.slice(0, 12).map((m) => (
              <li key={`${m.year}-${m.month}`}>
                {new Date(m.year, m.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                {isCurrentMonth(m.year, m.month) && ' (mois en cours)'}
              </li>
            ))}
          </ul>
        </div>
      )}
      {paymentDone ? (
        <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
          <CheckCircle size={18} />
          Paiement enregistré !
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleJekoPay}
            disabled={jekoLoading || unpaidMonths.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {jekoLoading ? (
              <><Loader2 size={18} className="animate-spin" /> Redirection…</>
            ) : (
              <><CreditCard size={18} /> Payer {monthly.amount != null ? `${Number(monthly.amount).toLocaleString('fr-FR')} FCFA` : ''} en ligne</>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center">Wave · Orange Money · MTN · Moov · Djamo</p>
        </div>
      )}
    </div>
  );
}

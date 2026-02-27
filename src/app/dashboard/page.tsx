'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';
import { LayoutDashboard, Wallet, PiggyBank, Users, CalendarDays, FileText, Bell, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  API_BASE,
  caisseApi,
  contributionsApi,
  activitiesApi,
  membersApi,
  reportsApi,
  type CaisseSummary,
  type ArrearsResult,
  type Expense,
  type Activity,
  type MemberHistory,
  type AnnualReport,
} from '@/lib/api';
import { cn, roleLabelFr } from '@/lib/utils';
import { toast } from 'sonner';

const CAISSE_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];
const ARREARS_ROLES = ['ADMIN', 'TREASURER'];
const MEMBERS_DASHBOARD_ROLES = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];
/** Rapports : bureau uniquement (pas Admin, pas membre / ancien membre / supporter). */
const RAPPORTS_ROLES = ['PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

function activityTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MATCH: 'Match',
    TRAINING: 'Entraînement',
    BIRTHDAY: 'Anniversaire',
    ANNOUNCEMENT: 'Annonce',
    OTHER: 'Autre',
  };
  return labels[type] ?? type;
}

const cardMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [caisseSummary, setCaisseSummary] = useState<CaisseSummary | null>(null);
  const [arrears, setArrears] = useState<ArrearsResult | null>(null);
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [myStatus, setMyStatus] = useState<MemberHistory | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [annualReport, setAnnualReport] = useState<AnnualReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canSeeCaisse = user && CAISSE_ROLES.includes(user.role);
  const canSeeArrears = user && ARREARS_ROLES.includes(user.role);
  const canSeeMembersCount = user && MEMBERS_DASHBOARD_ROLES.includes(user.role);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const promises: Promise<unknown>[] = [];

    if (canSeeCaisse) {
      promises.push(
        caisseApi.summary().then(setCaisseSummary).catch(() => setCaisseSummary(null)),
        caisseApi.expenses().then(setExpenses).catch(() => setExpenses([])),
        reportsApi.annual(currentYear).then(setAnnualReport).catch(() => setAnnualReport(null)),
      );
    }
    if (canSeeArrears) {
      promises.push(
        contributionsApi.arrears().then(setArrears).catch(() => setArrears(null)),
      );
    }
    if (canSeeMembersCount || canSeeArrears) {
      promises.push(
        membersApi.list().then((list) => setTotalMembers(list.length)).catch(() => setTotalMembers(null)),
      );
    }
    if (user) {
      promises.push(
        contributionsApi.me().then(setMyStatus).catch(() => setMyStatus(null)),
      );
    }
    promises.push(
      activitiesApi.list().then(setActivities).catch(() => setActivities([])),
    );

    setLoading(true);
    setError(null);
    Promise.all(promises)
      .then(() => {})
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Erreur';
        setError(msg);
        toast.error("Certaines données n'ont pas pu être chargées.");
      })
      .finally(() => setLoading(false));
  }, [canSeeCaisse, canSeeArrears, canSeeMembersCount, user]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingActivities = activities
    .filter((a) => new Date(a.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const pendingExpensesCount = expenses.filter(
    (e) => e.status === 'PENDING_TREASURER' || e.status === 'PENDING_COMMISSIONER',
  ).length;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const paidThisMonth =
    myStatus?.byMonth?.some((m) => m.year === currentYear && m.month === currentMonth) ?? false;
  const monthLabelDashboard = new Date(currentYear, currentMonth - 1).toLocaleString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const roleLabel = user?.role ? roleLabelFr(user.role) : '';

  const canSeeRapports = user && RAPPORTS_ROLES.includes(user.role);
  const cardCount =
    1 + // Mon rôle
    1 + // Ma cotisation
    (canSeeMembersCount && totalMembers !== null ? 1 : 0) +
    (canSeeCaisse && caisseSummary ? 1 : 0) +
    (canSeeArrears && arrears !== null ? 1 : 0) +
    (canSeeCaisse && !caisseSummary ? 1 : 0) +
    (canSeeCaisse && pendingExpensesCount > 0 ? 1 : 0) +
    1 + // Activités
    (canSeeRapports ? 1 : 0); // Rapports (bureau uniquement)
  const showNotificationsCard = cardCount === 5;
  const totalCards = cardCount + (showNotificationsCard ? 1 : 0);
  const placeholderCount = totalCards % 3 === 0 ? 0 : 3 - (totalCards % 3);

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-slate-200/80 min-w-0"
      >
        <div>
          <p className="text-xs font-semibold text-[var(--sky-blue-dark)] uppercase tracking-widest">
            Tableau de bord
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            Bon retour, <span className="text-[var(--sky-blue-dark)]">{user?.firstName}</span>
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-xl">
            Voici un aperçu de votre amicale.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-md min-w-[200px] ring-1 ring-slate-100">
            {user?.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl.startsWith('http') ? user.profilePhotoUrl : `${API_BASE}${user.profilePhotoUrl}`}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover bg-slate-100"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sky-blue)] text-white font-bold text-sm shadow-inner">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-[var(--foreground)] truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
            </div>
          </div>
        </div>
      </motion.header>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-amber-50 text-amber-800 px-4 py-3 text-sm"
        >
          Certaines données n'ont pas pu être chargées. Vous pouvez continuer à utiliser l'application.
        </motion.div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card flex justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial="initial"
            animate="animate"
            variants={{
              animate: { transition: { staggerChildren: 0.05 } },
            }}
          >
            <motion.div variants={cardMotion} className="h-full">
              <div className="card border-l-4 border-l-[var(--sky-blue)] h-full flex flex-col">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sky-blue-soft)] text-[var(--sky-blue-dark)]">
                    <LayoutDashboard size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Mon rôle
                    </h2>
                    <p className="mt-0.5 text-lg font-bold text-[var(--sky-blue-dark)] capitalize">
                      {user?.role ? roleLabelFr(user.role) : ''}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardMotion} className="h-full">
              <Link
                href="/dashboard/cotisations"
                className={cn(
                  'card card-hover block border-l-4 h-full',
                  paidThisMonth ? 'border-l-emerald-500' : 'border-l-amber-500',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      paidThisMonth ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600',
                    )}
                  >
                    <PiggyBank size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Ma cotisation
                    </h2>
                    <p className={cn('mt-0.5 text-lg font-bold', paidThisMonth ? 'text-emerald-700' : 'text-amber-700')}>
                      {myStatus === null
                        ? '—'
                        : paidThisMonth
                          ? `À jour pour ${monthLabelDashboard}`
                          : `En retard pour ${monthLabelDashboard}`}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Voir mes cotisations →</p>
                  </div>
                </div>
              </Link>
            </motion.div>

            {canSeeMembersCount && totalMembers !== null && (
              <motion.div variants={cardMotion} className="h-full">
                <Link href="/dashboard/membres" className="card card-hover border-l-4 border-l-[var(--sky-blue)] block h-full">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sky-blue-soft)] text-[var(--sky-blue-dark)]">
                      <Users size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Membres
                      </h2>
                      <p className="mt-0.5 text-xl font-bold text-[var(--foreground)]">
                        {totalMembers} membre{totalMembers !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">Voir la liste →</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {canSeeCaisse && caisseSummary && (
              <motion.div variants={cardMotion} className="h-full">
                <Link href="/dashboard/caisse" className="card card-hover border-l-4 border-l-emerald-500 block h-full">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <Wallet size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Solde de la caisse
                      </h2>
                      <p className="mt-0.5 text-xl font-bold text-[var(--foreground)]">
                        {Number(caisseSummary.global.solde).toLocaleString('fr-FR')} FCFA
                      </p>
                      <p className="text-sm text-slate-500 mt-1">Voir la caisse →</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {canSeeArrears && arrears !== null && (
              <motion.div variants={cardMotion} className="h-full">
                <Link href="/dashboard/cotisations" className="card card-hover border-l-4 border-l-amber-500 block h-full">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <PiggyBank size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Cotisations ce mois
                      </h2>
                      <p className="mt-0.5 text-xl font-bold text-[var(--foreground)]">
                        {arrears.total} membre{arrears.total !== 1 ? 's' : ''} en retard
                      </p>
                      <p className="text-sm text-slate-500 mt-1">Voir les cotisations →</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {canSeeCaisse && !caisseSummary && (
              <motion.div variants={cardMotion} className="h-full">
                <div className="card bg-slate-50 border-slate-200 h-full">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Caisse</h2>
                <p className="mt-2 text-slate-600 text-sm">
                  Accès réservé au Trésorier et au Commissaire aux comptes.
                </p>
                </div>
              </motion.div>
            )}

            {canSeeCaisse && pendingExpensesCount > 0 && (
              <motion.div variants={cardMotion} className="h-full">
                <Link href="/dashboard/caisse" className="card card-hover border-l-4 border-l-amber-500 block h-full">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alertes</h2>
                  <p className="mt-2 text-lg font-bold text-amber-700">
                    {pendingExpensesCount} dépense{pendingExpensesCount !== 1 ? 's' : ''} en attente
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Valider dans la caisse →</p>
                </Link>
              </motion.div>
            )}

            <motion.div variants={cardMotion} className="h-full">
              <Link href="/dashboard/activites" className="card card-hover border-l-4 border-l-[var(--sky-blue)] block h-full">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sky-blue-soft)] text-[var(--sky-blue-dark)]">
                    <CalendarDays size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Activités
                    </h2>
                    <p className="mt-0.5 text-lg font-bold text-[var(--foreground)]">
                      {activities.length} activité{activities.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Voir le calendrier →</p>
                  </div>
                </div>
              </Link>
            </motion.div>

            {canSeeRapports && (
              <motion.div variants={cardMotion} className="h-full">
                <Link href="/dashboard/rapports" className="card card-hover border-l-4 border-l-slate-400 block h-full">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Rapports
                      </h2>
                      <p className="mt-0.5 text-lg font-bold text-[var(--foreground)]">
                        Synthèses & bilans
                      </p>
                      <p className="text-sm text-slate-500 mt-1">Consulter les rapports →</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {showNotificationsCard && (
              <motion.div variants={cardMotion} className="h-full">
                <Link href="/dashboard/notifications" className="card card-hover border-l-4 border-l-[var(--sky-blue)] block h-full">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sky-blue-soft)] text-[var(--sky-blue-dark)]">
                      <Bell size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Notifications
                      </h2>
                      <p className="mt-0.5 text-lg font-bold text-[var(--foreground)]">
                        Alertes & actualités
                      </p>
                      <p className="text-sm text-slate-500 mt-1">Voir les notifications →</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {Array.from({ length: placeholderCount }, (_, i) => (
              <div key={`placeholder-${i}`} className="h-full" aria-hidden="true" />
            ))}
          </motion.div>

          {/* Caisse : entrées et sorties par mois */}
          {canSeeCaisse && annualReport?.months?.length ? (
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 pb-2 border-b border-slate-100">
                Caisse — entrées et sorties par mois ({annualReport.year})
              </h2>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={annualReport.months.map((m) => ({
                      mois: m.label,
                      entrées: m.totalEntries,
                      sorties: m.totalExits,
                      solde: m.solde,
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number | undefined) => [(value ?? 0).toLocaleString('fr-FR') + ' FCFA', '']}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="entrées" name="Entrées" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="sorties" name="Sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="solde" name="Solde" stroke="var(--sky-blue-dark)" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          ) : null}

          <AnimatePresence mode="wait">
            {!loading && upcomingActivities.length > 0 && (
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 pb-2 border-b border-slate-100">
                  Activités à venir
                </h2>
                <ul className="space-y-3">
                  {upcomingActivities.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                      <div>
                        <Link href={`/dashboard/activites/${a.id}`} className="font-semibold text-[var(--sky-blue-dark)] hover:text-[var(--sky-blue)] transition link-accent">
                          {a.title}
                        </Link>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {activityTypeLabel(a.type)} — {new Date(a.date).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <Link href={`/dashboard/activites/${a.id}`} className="text-sm font-medium text-[var(--sky-blue-dark)] hover:text-[var(--sky-blue)] shrink-0 transition">
                        Voir →
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard/activites" className="inline-block mt-4 text-sm font-semibold link-accent">
                  Toutes les activités →
                </Link>
              </motion.div>
            )}

            {!loading && activities.length > 0 && upcomingActivities.length === 0 && (
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">Activités à venir</h2>
                <p className="text-slate-500 text-sm">Aucune activité planifiée pour le moment.</p>
                <Link href="/dashboard/activites" className="inline-block mt-3 text-sm font-semibold link-accent">
                  Voir les activités →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <motion.div
        className="card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 pb-2 border-b border-slate-100">
          Accès rapide
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 text-slate-600">
          <li>
            <Link href="/dashboard/membres" className="font-medium link-accent inline-flex items-center gap-1.5">
              → Membres
            </Link>
          </li>
          <li>
            <Link href="/dashboard/cotisations" className="font-medium link-accent inline-flex items-center gap-1.5">
              → Cotisations
            </Link>
          </li>
          <li>
            <Link href="/dashboard/caisse" className="font-medium link-accent inline-flex items-center gap-1.5">
              → Caisse
            </Link>
          </li>
          {canSeeRapports && (
            <li>
              <Link href="/dashboard/rapports" className="font-medium link-accent inline-flex items-center gap-1.5">
                → Rapports
              </Link>
            </li>
          )}
          <li>
            <Link href="/dashboard/activites" className="font-medium link-accent inline-flex items-center gap-1.5">
              → Activités
            </Link>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ArrowUpRight, Wallet, Users, CalendarDays } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DashboardMembre } from '@/components/DashboardMembre';
import { EcheanceBanner } from '@/components/EcheanceBanner';
import { caisseApi, contributionsApi, membersApi, reportsApi, activitiesApi, type CaisseSummary, type AnnualContributionMatrix, type AnnualReport, type Member, type Payment, type Expense, type Activity } from '@/lib/api';
import { CHARTE } from '@/lib/charte';

const money = (n: number) => n.toLocaleString('fr-FR');
const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const dateCourt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const formatAxis = (v: number) => (v >= 1000 ? Math.round(v / 1000) + 'k' : String(v));

/** Tuile de chiffre de la charte : étiquette en capitales, grand chiffre Fraunces léger, ligne de tendance. */
function Metric({
  title,
  iconBg,
  icon,
  children,
  footer,
}: {
  title: string;
  iconBg: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--afc-border)] bg-[var(--afc-card)] p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md" style={{ background: iconBg }}>
          {icon}
        </div>
        <p className="afc-eyebrow min-w-0 break-words leading-tight">{title}</p>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1">{children}</div>
      {footer && <div className="mt-1 text-[11px] text-[var(--afc-muted)]">{footer}</div>}
    </div>
  );
}

const BUREAU_OR_ADMIN = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];

export default function DashboardPage() {
  const { user } = useAuth();
  if (user && !BUREAU_OR_ADMIN.includes(user.role)) return <MemberHome />;
  return <BureauDashboard />;
}

function MemberHome() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <EcheanceBanner audience="member" />
      <DashboardMembre />
    </div>
  );
}

function BureauDashboard() {
  const { user } = useAuth();
  const [caisse, setCaisse] = useState<CaisseSummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [matrix, setMatrix] = useState<AnnualContributionMatrix | null>(null);
  const [annual, setAnnual] = useState<AnnualReport | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      caisseApi.summary().then(setCaisse).catch(() => null),
      membersApi.list().then(setMembers).catch(() => setMembers([])),
      contributionsApi.annualMatrix(year).then(setMatrix).catch(() => null),
      reportsApi.annual(year).then(setAnnual).catch(() => null),
      contributionsApi.payments({ limit: 8 }).then(setPayments).catch(() => setPayments([])),
      caisseApi.expenses().then(setExpenses).catch(() => setExpenses([])),
      activitiesApi.list().then(setActivities).catch(() => setActivities([])),
    ]).finally(() => setLoading(false));
  }, [user, year]);

  const active = members.filter((m) => !m.isSuspended && m.role !== 'FORMER_PLAYER');
  const inactive = members.length - active.length;
  const rows = matrix?.members.map((m) => ({ ...m, current: m.months.find((x) => x.month === month) })).filter((m) => m.current && !['INACTIVE', 'NOT_DUE', 'EXEMPT'].includes(m.current.status)) ?? [];
  const paid = rows.filter((m) => m.current && ['PAID', 'ADVANCE'].includes(m.current.status)).length;
  const rate = rows.length ? Math.round((paid / rows.length) * 100) : 0;
  const late = matrix?.members.map((m) => { const months = m.months.filter((x) => x.status === 'LATE'); return { ...m, count: months.length, debt: months.reduce((s, x) => s + Math.max(0, (matrix.monthlyAmount ?? 0) - x.amountPaid), 0) }; }).filter((m) => m.count >= 2).sort((a, b) => b.count - a.count) ?? [];
  const approvedExpenses = expenses.filter((e) => e.status === 'APPROVED');
  const expenseTotal = approvedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const currentBox = caisse?.boxes.find((b) => b.isDefault) ?? caisse?.boxes[0];
  const exceptional = caisse?.boxes.find((b) => b.id !== currentBox?.id);
  const chart = annual?.months.map((m) => ({ month: shortMonth.format(new Date(m.year, m.month - 1, 1)), Encaissé: m.totalEntries, Dépensé: m.totalExits })) ?? [];

  return (
    <div className="space-y-6">
      <EcheanceBanner audience="bureau" />

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-r-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/caisse" className="block">
              <Metric title="Caisse de départ" iconBg="rgba(47,104,177,0.12)" icon={<Wallet size={14} color={CHARTE.primary} />} footer="Fonds avant l'application">
                <span className="afc-figure text-[36px] leading-none text-[var(--afc-text)]">{money(Number(currentBox?.openingBalance ?? 0))}</span>
                <span className="font-sans text-xs text-[var(--afc-muted)]">F CFA</span>
              </Metric>
            </Link>
            <Link href="/dashboard/caisse" className="block">
              <Metric
                title="Caisse globale · solde net"
                iconBg="rgba(47,104,177,0.12)"
                icon={<ArrowUpRight size={14} color={CHARTE.primary} />}
                footer={<span className="font-medium text-[var(--primary)]">↗ Solde net</span>}
              >
                <span className="afc-figure text-[36px] leading-none text-[var(--afc-text)]">{money(Number(caisse?.global.solde ?? 0))}</span>
                <span className="font-sans text-xs text-[var(--afc-muted)]">F CFA</span>
              </Metric>
            </Link>
            <Metric
              title="Caisse · courante"
              iconBg="rgba(47,104,177,0.12)"
              icon={<Wallet size={14} color={CHARTE.primary} />}
              footer={<span className="font-medium text-[var(--primary)]">↗ Solde net</span>}
            >
              <span className="afc-figure text-[36px] leading-none text-[var(--afc-text)]">{money(Number(currentBox?.solde ?? 0))}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">F</span>
            </Metric>
            <Metric title="Caisse · exceptionnelle" iconBg="rgba(127,100,180,0.14)" icon={<Wallet size={14} color={CHARTE.chart5} />} footer="Solde net">
              <span className="afc-figure text-[36px] leading-none text-[var(--afc-text)]">{money(Number(exceptional?.solde ?? 0))}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">F</span>
            </Metric>
            <Metric title="Membres actifs" iconBg="rgba(var(--afc-hl),0.06)" icon={<Users size={14} color={CHARTE.muted} />} footer={`${inactive} inactif${inactive !== 1 ? 's' : ''}`}>
              <span className="afc-figure text-[36px] leading-none text-[var(--afc-text)]">{active.length}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">/ {members.length}</span>
            </Metric>
            <Metric
              title={'À jour · ' + monthName.format(now)}
              iconBg="rgba(47,104,177,0.12)"
              icon={<ArrowUpRight size={14} color={CHARTE.primary} />}
              footer={<span className="font-medium text-[var(--primary)]">↗ {rate}% du club concerné</span>}
            >
              <span className="afc-figure text-[36px] leading-none text-[var(--afc-text)]">{paid}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">/ {rows.length}</span>
            </Metric>
            <Metric title="Dépenses · total" iconBg="rgba(var(--afc-hl),0.06)" icon={<CalendarDays size={14} color={CHARTE.muted} />} footer={`${approvedExpenses.length} dépense${approvedExpenses.length !== 1 ? 's' : ''}`}>
              <span className="afc-figure text-[36px] leading-none text-[var(--afc-text)]">{money(expenseTotal)}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">F CFA</span>
            </Metric>
            <Metric
              title="Débiteurs ≥ 2 mois"
              iconBg="rgba(204,82,51,0.14)"
              icon={<Users size={14} color={CHARTE.destructive} />}
              footer={<span className="font-medium text-[var(--destructive)]">{money(late.reduce((s, m) => s + m.debt, 0))} F à recouvrer</span>}
            >
              <span className="afc-figure text-[36px] leading-none text-[var(--destructive)]">{late.length}</span>
            </Metric>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
              <h2 className="font-serif text-lg text-[var(--afc-text)]">Entrées et sorties</h2>
              <p className="text-xs text-[var(--afc-muted)]">Cotisations encaissées et dépenses, mois par mois</p>
              <div className="mt-4 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid vertical={false} stroke="rgba(var(--afc-hl),0.08)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--afc-muted)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--afc-muted)', fontSize: 11 }} tickFormatter={formatAxis} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--afc-tooltip-bg)', border: '1px solid var(--afc-border)', borderRadius: 10, color: 'var(--afc-text)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--afc-muted)' }} />
                    <Bar dataKey="Encaissé" fill={CHARTE.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dépensé" fill={CHARTE.destructive} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-lg text-[var(--afc-text)]">Membres en retard</h2>
                  <p className="text-xs text-[var(--afc-muted)]">≥ 2 mois de retard — à relancer</p>
                </div>
                <Link href="/dashboard/membres" className="afc-button-ghost shrink-0 text-[13px]">Voir tout →</Link>
              </div>
              {late.length ? (
                <div className="mt-3.5 divide-y divide-[var(--afc-border-soft)]">
                  {late.slice(0, 5).map((m) => (
                    <Link key={m.id} href={'/dashboard/membres/voir?id=' + m.id} className="flex items-center justify-between py-3 hover:opacity-80">
                      <span className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--afc-avatar-bg)] text-[11px] font-semibold text-[var(--afc-avatar-text)]">
                          {m.firstName?.[0]}{m.lastName?.[0]}
                        </span>
                        <span className="text-[13px] font-medium text-[var(--afc-text)]">{m.firstName} {m.lastName}</span>
                      </span>
                      <span className="afc-badge-red rounded-full border px-2.5 py-1 text-[11px] font-medium">
                        {m.count} mois
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[var(--afc-muted)]">Aucun débiteur de deux mois ou plus.</p>
              )}
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
            <div className="flex items-start justify-between gap-3 p-5">
              <div>
                <h2 className="font-serif text-lg text-[var(--afc-text)]">Activité récente</h2>
                <p className="text-xs text-[var(--afc-muted)]">Derniers paiements enregistrés</p>
              </div>
              <Link href="/dashboard/cotisations/historique" className="afc-button-ghost shrink-0 text-[13px]">Tout l&apos;historique →</Link>
            </div>
            {payments.length ? (
              <div className="overflow-x-auto pb-2">
                <table className="afc-table-dark w-full min-w-[700px] text-sm">
                  <thead>
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Membre</th>
                      <th className="px-5 py-3 text-left">Type</th>
                      <th className="px-5 py-3 text-left">Libellé</th>
                      <th className="px-5 py-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 6).map((p) => (
                      <tr key={p.id} className="border-t border-[var(--afc-border-soft)]">
                        <td className="afc-mono px-5 py-3 text-[13px] text-[var(--afc-muted)]">{dateCourt.format(new Date(p.paidAt))}</td>
                        <td className="px-5 py-3 font-medium text-[var(--afc-text)]">{p.member ? p.member.firstName + ' ' + p.member.lastName : 'Membre'}</td>
                        <td className="px-5 py-3">
                          <span className="afc-badge-blue afc-badge-type rounded-full border px-2 py-0.5">Mensuelle</span>
                        </td>
                        <td className="px-5 py-3 text-[var(--afc-muted)]">{p.periodYear && p.periodMonth ? monthName.format(new Date(p.periodYear, p.periodMonth - 1, 1)) : '—'}</td>
                        <td className="afc-mono px-5 py-3 text-right text-[13px] font-medium text-[var(--afc-text)]">{money(Number(p.amount))} F</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 pb-6 text-sm text-[var(--afc-muted)]">Aucun paiement récent.</p>
            )}
          </section>

          <section className="flex items-center justify-between rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
            <div>
              <h2 className="font-serif text-lg text-[var(--afc-text)]">Activités à venir</h2>
              <p className="text-xs text-[var(--afc-muted)]">{activities.length ? activities.length + ' activité(s)' : 'Aucune activité planifiée pour le moment.'}</p>
            </div>
            <Link href="/dashboard/activites" className="text-[13px] font-medium text-[var(--primary)]">Voir les activités →</Link>
          </section>
        </>
      )}
    </div>
  );
}

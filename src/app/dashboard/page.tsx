'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ArrowUpRight, Wallet, Users, CalendarDays, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DashboardMembre } from '@/components/DashboardMembre';
import { EcheanceBanner } from '@/components/EcheanceBanner';
import { caisseApi, contributionsApi, membersApi, reportsApi, activitiesApi, type CaisseSummary, type AnnualContributionMatrix, type AnnualReport, type Member, type Payment, type Expense, type Activity } from '@/lib/api';

const money = (n: number) => n.toLocaleString('fr-FR');
const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const formatAxis = (v: number) => (v >= 1000 ? Math.round(v / 1000) + 'k' : String(v));

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
    <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px]" style={{ background: iconBg }}>
          {icon}
        </div>
        <p className="text-[11px] tracking-[0.2px] text-[var(--afc-muted-4)]">{title}</p>
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
  const hour = new Date().getHours();
  const greeting = hour < 18 ? 'Bonjour' : 'Bonsoir';
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-[var(--afc-text)]">{greeting}, {user?.firstName ?? ''}</h1>
        <p className="mt-1 text-[13px] text-[var(--afc-muted-4)]">Votre situation et la trésorerie du club.</p>
      </header>
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
  const hour = now.getHours();
  const greeting = hour >= 18 || hour < 5 ? 'Bonsoir' : 'Bonjour';

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--afc-text)]">{greeting}, {user?.firstName ?? ''}</h1>
          <p className="mt-1 text-[13px] text-[var(--afc-muted-4)]">Votre trésorerie du club et l&apos;activité des 30 derniers jours.</p>
        </div>
        <Link
          href="/dashboard/cotisations/paiement"
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-b from-[#DDB65C] to-[#C9A048] py-2.5 pl-3 pr-5 text-[13px] font-semibold text-[#171308] shadow-[0_4px_14px_rgba(201,160,72,0.35)] transition hover:shadow-[0_6px_18px_rgba(201,160,72,0.45)] hover:-translate-y-px active:translate-y-0"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#171308]/10 transition group-hover:bg-[#171308]/15">
            <Plus size={14} aria-hidden="true" />
          </span>
          Nouveau paiement
        </Link>
      </header>

      <EcheanceBanner audience="bureau" />

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/caisse" className="block">
              <Metric title="CAISSE DE DÉPART" iconBg="rgba(201,160,72,0.16)" icon={<Wallet size={14} color="#C9A048" />} footer="Fonds avant l'application">
                <span className="font-serif text-xl text-[var(--afc-text)]">{money(Number(currentBox?.openingBalance ?? 0))}</span>
                <span className="font-sans text-xs text-[var(--afc-muted)]">F CFA</span>
              </Metric>
            </Link>
            <Link href="/dashboard/caisse" className="block">
              <Metric
                title="CAISSE GLOBALE"
                iconBg="rgba(46,95,163,0.2)"
                icon={<ArrowUpRight size={14} color="#2E5FA3" />}
                footer={<span className="font-medium text-[#52C08A]">↗ Solde net</span>}
              >
                <span className="font-serif text-xl text-[var(--afc-text)]">{money(Number(caisse?.global.solde ?? 0))}</span>
                <span className="font-sans text-xs text-[var(--afc-muted)]">F CFA</span>
              </Metric>
            </Link>
            <Metric
              title="CAISSE COURANTE"
              iconBg="rgba(46,95,163,0.2)"
              icon={<Wallet size={14} color="#2E5FA3" />}
              footer={<span className="font-medium text-[#52C08A]">↗ Solde net</span>}
            >
              <span className="font-serif text-xl text-[var(--afc-text)]">{money(Number(currentBox?.solde ?? 0))}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">F</span>
            </Metric>
            <Metric title="CAISSE EXCEPTIONNELLE" iconBg="rgba(255,255,255,0.06)" icon={<Wallet size={14} color="var(--afc-text-soft)" />} footer="Solde net">
              <span className="font-serif text-xl text-[var(--afc-text)]">{money(Number(exceptional?.solde ?? 0))}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">F</span>
            </Metric>
            <Metric title="MEMBRES ACTIFS" iconBg="rgba(255,255,255,0.06)" icon={<Users size={14} color="var(--afc-text-soft)" />} footer={`${inactive} inactif${inactive !== 1 ? 's' : ''}`}>
              <span className="font-serif text-xl text-[var(--afc-text)]">{active.length}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">/ {members.length}</span>
            </Metric>
            <Metric
              title={('À JOUR · ' + monthName.format(now)).toUpperCase()}
              iconBg="rgba(82,192,138,0.16)"
              icon={<ArrowUpRight size={14} color="#52C08A" />}
              footer={<span className="font-medium text-[#52C08A]">↗ {rate}% du club concerné</span>}
            >
              <span className="font-serif text-xl text-[var(--afc-text)]">{paid}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">/ {rows.length}</span>
            </Metric>
            <Metric title="DÉPENSES TOTAL" iconBg="rgba(255,255,255,0.06)" icon={<CalendarDays size={14} color="var(--afc-text-soft)" />} footer={`${approvedExpenses.length} dépense${approvedExpenses.length !== 1 ? 's' : ''}`}>
              <span className="font-serif text-xl text-[var(--afc-text)]">{money(expenseTotal)}</span>
              <span className="font-sans text-xs text-[var(--afc-muted)]">F CFA</span>
            </Metric>
            <Metric
              title="DÉBITEURS ≥ 2 MOIS"
              iconBg="rgba(212,83,89,0.18)"
              icon={<Users size={14} color="#E28A87" />}
              footer={<span className="font-medium text-[#E28A87]">{money(late.reduce((s, m) => s + m.debt, 0))} F à recouvrer</span>}
            >
              <span className="font-serif text-xl text-[#E28A87]">{late.length}</span>
            </Metric>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
              <h2 className="text-sm font-medium text-[var(--afc-text)]">Entrées et sorties</h2>
              <p className="text-xs text-[var(--afc-muted)]">Cotisations encaissées et dépenses, mois par mois</p>
              <div className="mt-4 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--afc-muted)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--afc-muted)', fontSize: 11 }} tickFormatter={formatAxis} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#1D2431', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--afc-text)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--afc-muted-4)' }} />
                    <Bar dataKey="Encaissé" fill="#2E5FA3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dépensé" fill="#C9645A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
              <h2 className="text-sm font-medium text-[var(--afc-text)]">Membres en retard</h2>
              <p className="text-xs text-[var(--afc-muted)]">≥ 2 mois de retard — à relancer</p>
              {late.length ? (
                <div className="mt-3.5 divide-y divide-[rgba(var(--afc-hl),0.06)]">
                  {late.slice(0, 5).map((m) => (
                    <Link key={m.id} href={'/dashboard/membres/' + m.id} className="flex items-center justify-between py-2.5 hover:opacity-80">
                      <span className="text-[13px] font-medium text-[var(--afc-text)]">{m.firstName} {m.lastName}</span>
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(212,83,89,0.16)', color: '#E28A87' }}>
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
            <div className="p-5">
              <h2 className="text-sm font-medium text-[var(--afc-text)]">Activité récente</h2>
              <p className="text-xs text-[var(--afc-muted)]">Derniers paiements enregistrés</p>
            </div>
            {payments.length ? (
              <div className="overflow-x-auto pb-2">
                <table className="afc-table-dark w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="bg-[rgba(var(--afc-hl),0.03)]">
                      <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[var(--afc-muted)]">DATE</th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[var(--afc-muted)]">MEMBRE</th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[var(--afc-muted)]">TYPE</th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[var(--afc-muted)]">LIBELLÉ</th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[var(--afc-muted)]">MONTANT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 6).map((p) => (
                      <tr key={p.id} className="border-t border-[rgba(var(--afc-hl),0.05)]">
                        <td className="px-5 py-3 text-[var(--afc-muted-4)]">{new Date(p.paidAt).toLocaleDateString('fr-FR')}</td>
                        <td className="px-5 py-3 font-medium text-[var(--afc-text)]">{p.member ? p.member.firstName + ' ' + p.member.lastName : 'Membre'}</td>
                        <td className="px-5 py-3 text-[var(--afc-muted-4)]">Mensuelle</td>
                        <td className="px-5 py-3 text-[var(--afc-muted-4)]">{p.periodYear && p.periodMonth ? monthName.format(new Date(p.periodYear, p.periodMonth - 1, 1)) : '—'}</td>
                        <td className="px-5 py-3 font-semibold text-[#52C08A]">{money(Number(p.amount))} F</td>
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
              <h2 className="font-serif text-base font-semibold text-[var(--afc-text)]">Activités à venir</h2>
              <p className="text-xs text-[var(--afc-muted)]">{activities.length ? activities.length + ' activité(s)' : 'Aucune activité planifiée pour le moment.'}</p>
            </div>
            <Link href="/dashboard/activites" className="text-[13px] font-medium text-[#C9A048]">Voir les activités →</Link>
          </section>
        </>
      )}
    </div>
  );
}

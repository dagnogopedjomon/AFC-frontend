'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ArrowUpRight, Wallet, Users, CalendarDays } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { caisseApi, contributionsApi, membersApi, reportsApi, activitiesApi, type CaisseSummary, type AnnualContributionMatrix, type AnnualReport, type Member, type Payment, type Expense, type Activity } from '@/lib/api';

const money = (n: number) => n.toLocaleString('fr-FR');
const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

function Metric({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return <div className="card min-h-[150px] p-5"><p className="text-[11px] font-medium uppercase tracking-[.17em] text-slate-500">{title}</p><div className="mt-4">{children}</div>{footer && <div className="mt-2 text-xs text-slate-500">{footer}</div>}</div>;
}

export default function DashboardPage() {
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

  return <div className="space-y-6">
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
      <div><h1 className="font-serif text-3xl text-slate-900">Tableau de bord</h1><p className="mt-1 text-sm text-slate-500">Vue d'ensemble</p></div>
      <Link href="/dashboard/cotisations/paiement" className="afc-button-primary">＋ Nouveau paiement</Link>
    </header>
    {loading ? <div className="card grid min-h-64 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#3269ac] border-r-transparent" /></div> : <>
      <div className="grid gap-4">
        <div className="card flex items-center gap-5 py-5"><div className="grid h-14 w-14 place-items-center rounded-xl bg-[#edf3fb] text-[#3269ac]"><Wallet size={25}/></div><div><p className="text-[11px] font-medium uppercase tracking-[.18em] text-slate-500">Caisse de départ</p><p className="mt-1 font-serif text-3xl text-slate-900">0 <span className="font-sans text-sm text-slate-500">F CFA</span></p><p className="text-xs text-slate-500">Aucun fonds initial distinct enregistré</p></div></div>
        <Link href="/dashboard/caisse" className="card card-hover flex items-center gap-5 py-5"><div className="grid h-14 w-14 place-items-center rounded-xl bg-[#edf3fb] text-[#3269ac]"><Wallet size={25}/></div><div><p className="text-[11px] font-medium uppercase tracking-[.18em] text-slate-500">Caisse globale · solde net</p><p className="mt-1 font-serif text-3xl text-slate-900">{money(Number(caisse?.global.solde ?? 0))} <span className="font-sans text-sm text-slate-500">F CFA</span></p><p className="text-xs text-slate-500">Caisse courante + caisse exceptionnelle (nets des dépenses)</p></div></Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Metric title="Caisse · courante"><p className="font-serif text-3xl">{money(Number(currentBox?.solde ?? 0))}<span className="ml-1 font-sans text-xs text-slate-500">F</span></p><Link href="/dashboard/caisse" className="mt-3 inline-flex items-center gap-1 text-xs text-[#3269ac]"><ArrowUpRight size={13}/> Solde net</Link></Metric>
        <Metric title="Caisse · exceptionnelle"><p className="font-serif text-3xl">{money(Number(exceptional?.solde ?? 0))}<span className="ml-1 font-sans text-xs text-slate-500">F</span></p><p className="mt-3 text-xs">Solde net</p></Metric>
        <Metric title="Membres actifs"><p className="font-serif text-3xl">{active.length}<span className="ml-1 font-sans text-sm text-slate-500">/ {members.length}</span></p><p className="mt-2 text-xs">{inactive} inactif{inactive !== 1 ? 's' : ''}</p></Metric>
        <Metric title={'À jour · ' + monthName.format(now)}><p className="font-serif text-3xl">{paid}<span className="ml-1 font-sans text-sm text-slate-500">/ {rows.length}</span></p><p className="mt-2 text-xs font-medium text-[#3269ac]">↗ {rate}% du club concerné</p></Metric>
        <Metric title="Dépenses · total"><p className="font-serif text-3xl">{money(expenseTotal)}<span className="ml-1 font-sans text-xs text-slate-500">F CFA</span></p><p className="mt-2 text-xs">{approvedExpenses.length} dépense{approvedExpenses.length !== 1 ? 's' : ''} · {money(expenseTotal)} F courantes</p></Metric>
        <Metric title="Débiteurs ≥ 2 mois"><p className="font-serif text-3xl text-[#d95537]">{late.length}</p><p className="mt-2 text-xs font-medium text-[#d95537]">{money(late.reduce((s, m) => s + m.debt, 0))} F à recouvrer</p></Metric>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_.75fr]">
        <section className="card"><div className="border-b border-slate-100 pb-4"><h2 className="font-serif text-xl">Entrées et sorties</h2><p className="text-sm text-slate-500">Cotisations encaissées et dépenses, mois par mois</p></div><div className="mt-4 h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid vertical={false} stroke="#e5e7eb"/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={(v) => Math.round(v/1000) + 'k'}/><Tooltip/><Legend/><Bar dataKey="Encaissé" fill="#356fb5" radius={[5,5,0,0]}/><Bar dataKey="Dépensé" fill="#de725b" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>
        <section className="card p-0 overflow-hidden"><div className="p-5"><h2 className="font-serif text-xl">Membres en retard</h2><p className="text-sm text-slate-500">≥ 2 mois de retard — à relancer</p></div>{late.length ? <div className="divide-y divide-slate-100">{late.slice(0,5).map((m) => <Link key={m.id} href={'/dashboard/membres/' + m.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"><span className="text-sm font-semibold">{m.firstName} {m.lastName}</span><span className="rounded-full bg-red-50 px-3 py-1 text-xs text-[#d95537]">{m.count} mois</span></Link>)}</div> : <p className="px-5 pb-6 text-sm text-slate-500">Aucun débiteur de deux mois ou plus.</p>}</section>
      </div>
      <section className="card p-0 overflow-hidden"><div className="p-5"><h2 className="font-serif text-xl">Activité récente</h2><p className="text-sm text-slate-500">Derniers paiements enregistrés</p></div>{payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Membre</th><th className="px-5 py-3 text-left">Type</th><th className="px-5 py-3 text-left">Libellé</th><th className="px-5 py-3 text-left">Montant</th></tr></thead><tbody>{payments.slice(0,6).map((p) => <tr key={p.id}><td className="px-5 py-3">{new Date(p.paidAt).toLocaleDateString('fr-FR')}</td><td className="px-5 py-3 font-medium">{p.member ? p.member.firstName + ' ' + p.member.lastName : 'Membre'}</td><td className="px-5 py-3">Mensuelle</td><td className="px-5 py-3">{p.periodYear && p.periodMonth ? monthName.format(new Date(p.periodYear, p.periodMonth - 1, 1)) : '—'}</td><td className="px-5 py-3 font-semibold text-emerald-700">{money(Number(p.amount))} F</td></tr>)}</tbody></table></div> : <p className="px-5 pb-6 text-sm text-slate-500">Aucun paiement récent.</p>}</section>
      <section className="card"><div className="flex items-start justify-between"><div><h2 className="font-serif text-xl">Activités à venir</h2><p className="text-sm text-slate-500">{activities.length ? activities.length + ' activité(s)' : 'Aucune activité planifiée pour le moment.'}</p></div><Link href="/dashboard/activites" className="text-sm text-[#3269ac]">Voir les activités →</Link></div></section>
    </>}</div>;
}

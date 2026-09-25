'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Landmark, Mail, Phone, CalendarDays, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { caisseApi, contributionsApi, membersApi, type CaisseSummary, type LivreEntry, type Member, type MemberHistory } from '@/lib/api';

type Debt = Awaited<ReturnType<typeof contributionsApi.meDebtSummary>>;

const money = (n: number) => Math.round(n).toLocaleString('fr-FR');
const PERIODS = [
  { value: 'month', label: 'Ce mois-ci' },
  { value: 'last', label: 'Mois dernier' },
  { value: 'year', label: 'Cette année' },
  { value: 'all', label: 'Depuis le début' },
] as const;

function Kpi({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.04)] text-[#C9A048]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--afc-muted)]">{label}</p>
        <p className="mt-0.5 font-serif text-3xl text-[var(--afc-text)]">{value} <span className="font-sans text-xs text-[var(--afc-muted)]">F CFA</span></p>
        <p className="text-xs text-[var(--afc-muted)]">{note}</p>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--afc-muted)]">{icon}{label}</p>
      <div className="mt-1 text-[15px] text-[var(--afc-text)]">{children}</div>
    </div>
  );
}

export function DashboardMembre() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CaisseSummary | null>(null);
  const [livre, setLivre] = useState<LivreEntry[]>([]);
  const [history, setHistory] = useState<MemberHistory | null>(null);
  const [debt, setDebt] = useState<Debt | null>(null);
  const [profile, setProfile] = useState<Member | null>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['value']>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      caisseApi.summary().then(setSummary).catch(() => null),
      caisseApi.livre(2000).then(setLivre).catch(() => setLivre([])),
      contributionsApi.me().then(setHistory).catch(() => null),
      contributionsApi.meDebtSummary().then(setDebt).catch(() => null),
      membersApi.me().then(setProfile).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const inRange = (d: Date) =>
      period === 'month' ? d >= start
        : period === 'last' ? d >= lastStart && d < start
          : period === 'year' ? d >= yearStart
            : true;
    let entries = 0;
    let exits = 0;
    for (const e of livre) {
      if (!inRange(new Date(e.date))) continue;
      if (e.type === 'entree') entries += Number(e.amount);
      else exits += Number(e.amount);
    }
    return { entries, exits };
  }, [livre, period]);

  const situation = useMemo(() => {
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();
    const paidRows = history?.byMonth ?? [];
    const isDue = (r: { year: number; month: number }) => r.year * 12 + (r.month - 1) <= nowKey;
    const dueRows = paidRows.filter(isDue);
    const advanceRows = paidRows.filter((r) => !isDue(r));
    const dueMonths = dueRows.length + (debt?.unpaidMonths.length ?? 0);
    const due = dueMonths * (debt?.monthlyAmount ?? 0);
    const paid = dueRows.reduce((sum, r) => sum + r.amount, 0);
    const advance = advanceRows.reduce((sum, r) => sum + r.amount, 0);
    const last = paidRows.reduce<{ year: number; month: number } | null>(
      (acc, r) => (!acc || r.year * 12 + r.month > acc.year * 12 + acc.month ? r : acc), null);
    const paidThrough = last ? new Date(last.year, last.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : null;
    return {
      dueMonths, due, paid, covered: dueRows.length, balance: paid - due, advance, advanceMonths: advanceRows.length,
      totalPaid: paidRows.reduce((sum, r) => sum + r.amount, 0), totalMonths: paidRows.length, paidThrough,
    };
  }, [history, debt]);

  const periodLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();
  const joined = profile && 'createdAt' in profile && profile.createdAt
    ? new Date(String(profile.createdAt)).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const suspended = user?.isSuspended;

  if (loading) {
    return (
      <div className="grid min-h-64 place-items-center rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Kpi
        icon={<Landmark size={22} />}
        label="Caisse globale du club"
        value={money(summary?.global.solde ?? 0)}
        note="Solde net de la caisse du club, tous membres confondus"
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--afc-muted)]">Entrées et sorties</p>
          <select aria-label="Période" className="afc-login-input !w-44 text-sm" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="grid gap-3.5 md:grid-cols-2">
          <Kpi icon={<ArrowUpCircle size={22} />} label="Entrées du club" value={money(totals.entries)} note={`Total des entrées — ${periodLabel}`} />
          <Kpi icon={<ArrowDownCircle size={22} />} label="Sorties du club" value={money(totals.exits)} note={`Total des sorties — ${periodLabel}`} />
        </div>
      </div>

      <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <h2 className="flex items-center gap-2 font-serif text-xl text-[var(--afc-text)]"><Wallet size={18} className="text-[var(--afc-muted)]" /> Ma situation</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <Field label="Situation">
            {situation.balance < 0 || situation.advanceMonths > 0 ? (
              <div className="space-y-2">
                {situation.balance < 0 && (
                  <div>
                    <span className="font-serif text-3xl text-red-500">{money(-situation.balance)}</span> <span className="text-xs text-[var(--afc-muted)]">F CFA de retard</span>
                  </div>
                )}
                {situation.advanceMonths > 0 && (
                  <div>
                    <span className="font-serif text-2xl text-emerald-500">+{money(situation.advance)}</span> <span className="text-xs text-[var(--afc-muted)]">F CFA d’avance ({situation.advanceMonths} mois)</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="font-serif text-3xl">À jour</span>
            )}
          </Field>
          <Field label="Cotisations versées">
            <span className="font-serif text-3xl">{money(situation.totalPaid)}</span> <span className="text-xs text-[var(--afc-muted)]">F CFA</span>
            <p className="text-xs text-[var(--afc-muted)]">{money(situation.due)} F CFA dus à ce jour{situation.advance > 0 ? ` + ${money(situation.advance)} F d’avance` : ''}</p>
          </Field>
          <Field label="Mois couverts">
            <span className="font-serif text-3xl">{situation.totalMonths}</span> <span className="text-xs text-[var(--afc-muted)]">mois payés</span>
            <p className="text-xs text-[var(--afc-muted)]">{situation.paidThrough ? `jusqu’en ${situation.paidThrough} · ` : ''}{situation.covered} / {situation.dueMonths} mois dus à ce jour</p>
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <h2 className="font-serif text-xl text-[var(--afc-text)]">Mon profil</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Nom">{user?.firstName} {user?.lastName}</Field>
          <Field label="Statut d’adhésion">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${suspended ? 'afc-badge-red' : 'afc-badge-blue'}`}>{suspended ? 'Suspendu' : 'Actif'}</span>
          </Field>
          <Field icon={<Phone size={12} />} label="Téléphone">{user?.phone ?? '—'}</Field>
          <Field icon={<Mail size={12} />} label="E-mail">{user?.email || '—'}</Field>
          <Field icon={<CalendarDays size={12} />} label="Date d’adhésion">{joined}</Field>
        </div>
      </section>
    </div>
  );
}

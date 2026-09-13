'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Pencil, UserRound, KeyRound, PauseCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE, authApi, membersApi, type Member } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const BUREAU = ['ADMIN','PRESIDENT','SECRETARY_GENERAL','TREASURER','COMMISSIONER','GENERAL_MEANS_MANAGER'];

function matches(member: Member, query: string) {
  const q = query.trim().toLowerCase();
  return !q || [member.firstName, member.lastName, member.phone, member.email ?? ''].join(' ').toLowerCase().includes(q);
}

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue'|'gray'|'green'|'amber'|'red' }) {
  const cls = { blue:'bg-blue-50 text-blue-700', gray:'bg-slate-100 text-slate-600', green:'bg-emerald-50 text-emerald-700', amber:'bg-amber-50 text-amber-700', red:'bg-red-50 text-red-700' }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function MembresPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL'|'ACTIVE'|'PROSPECT'|'LATE'|'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const canList = !!user && BUREAU.includes(user.role);

  useEffect(() => { if (!canList) { setLoading(false); return; } membersApi.list().then(setMembers).catch(() => setMembers([])).finally(() => setLoading(false)); }, [canList]);

  async function toggleSuspension(member: Member) {
    const next = !member.isSuspended;
    if (!window.confirm(next ? `Geler le compte de ${member.firstName} ${member.lastName} ?` : `Réactiver le compte de ${member.firstName} ${member.lastName} ?`)) return;
    setActioning(member.id);
    try {
      const updated = await membersApi.update(member.id, { isSuspended: next });
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, ...updated } : item));
      toast.success(next ? 'Compte gelé.' : 'Compte réactivé.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Suppression impossible'); }
    finally { setActioning(null); }
  }

  async function sendActivation(member: Member) {
    setActioning(member.id);
    try {
      const result = await authApi.sendActivationOtp(member.phone);
      toast.success(result.demoCode ? `Code de test : ${result.demoCode}` : 'Lien d’activation renvoyé au membre.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Envoi impossible'); }
    finally { setActioning(null); }
  }

  const filtered = useMemo(() => members.filter((m) => {
    if (!matches(m, query)) return false;
    if (filter === 'ACTIVE') return !m.isSuspended && m.role !== 'FORMER_PLAYER';
    if (filter === 'PROSPECT') return m.membershipStatus === 'PROSPECT';
    if (filter === 'LATE') return !!m.isSuspended;
    if (filter === 'INACTIVE') return m.role === 'FORMER_PLAYER';
    return true;
  }), [members, query, filter]);

  if (!canList) return <div className="card"><h1 className="text-xl font-bold">Membres</h1><p className="mt-2 text-slate-600">Accès réservé au bureau du club.</p></div>;

  const countActive = members.filter((m) => !m.isSuspended && m.role !== 'FORMER_PLAYER').length;
  const countProspects = members.filter((m) => m.membershipStatus === 'PROSPECT').length;
  const countLate = members.filter((m) => !!m.isSuspended).length;
  const countInactive = members.filter((m) => m.role === 'FORMER_PLAYER').length;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold text-slate-900">Membres</h1><p className="mt-1 text-sm text-slate-500">Liste & suivi des joueurs du club</p></div>
      <div className="flex flex-wrap gap-3"><Link href="/dashboard/cotisations/paiement" className="afc-button-primary"><Plus size={16} aria-hidden="true" /> Nouveau paiement</Link>{user?.role === 'ADMIN' && <Link href="/dashboard/membres/new" className="btn-primary"><Plus size={16} aria-hidden="true" /> Nouveau membre</Link>}</div>
    </header>
    {params.get('created') === '1' && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Compte créé avec succès.</div>}
    <section className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {([['ALL',`Tous (${members.length})`],['ACTIVE',`Actifs (${countActive})`],['PROSPECT',`Prospects (${countProspects})`],['LATE',`En retard (${countLate})`],['INACTIVE',`Inactifs (${countInactive})`]] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-md px-3 py-2 font-medium ${filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
        </div>
        <div className="relative w-full max-w-xs"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input aria-label="Rechercher un membre" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un membre…" className="input-field w-full !pl-11"/></div>
      </div>
    </section>
    <section className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left">
          <thead><tr><th className="px-5 py-3">Membre</th><th className="px-5 py-3">Téléphone</th><th className="px-5 py-3">Date adhésion</th><th className="px-5 py-3">Statut</th><th className="px-5 py-3">Septembre 2026</th><th className="px-5 py-3">Compte</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={7} className="p-10 text-center text-slate-500">Chargement…</td></tr> : filtered.map((m) => {
            const former = m.role === 'FORMER_PLAYER';
            const bureau = BUREAU.includes(m.role) && m.role !== 'ADMIN';
            return <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-5 py-3"><div className="flex items-center gap-3">{m.profilePhotoUrl ? <img src={m.profilePhotoUrl.startsWith('http') ? m.profilePhotoUrl : API_BASE + m.profilePhotoUrl} className="h-8 w-8 rounded-full object-cover" alt="" /> : <span className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-blue-700">{m.firstName[0]}{m.lastName[0]}</span>}<Link href={`/dashboard/membres/${m.id}`} className="font-medium text-slate-800 hover:text-blue-700">{m.firstName} {m.lastName}</Link></div></td>
              <td className="px-5 py-3 font-mono text-xs text-slate-600">{m.phone}</td>
              <td className="px-5 py-3 font-mono text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</td>
              <td className="px-5 py-3"><Badge tone={m.isSuspended ? 'red' : bureau ? 'gray' : former ? 'gray' : m.membershipStatus === 'PROSPECT' ? 'amber' : 'blue'}>{m.isSuspended ? 'Inactif' : bureau ? 'Bureau' : former ? 'Inactif' : m.membershipStatus === 'PROSPECT' ? 'Prospect' : 'Actif'}</Badge></td>
              <td className="px-5 py-3"><Badge tone={former ? 'gray' : 'blue'}>{former ? '—' : 'Payé'}</Badge></td>
              <td className="px-5 py-3"><Badge tone={m.isSuspended ? 'red' : 'blue'}>{m.isSuspended ? 'Inactif' : 'Actif'}</Badge></td>
              <td className="px-5 py-3"><div className="flex justify-end gap-3 text-slate-600"><Link title="Modifier le membre" aria-label="Modifier le membre" href={`/dashboard/membres/${m.id}`} className="rounded p-1 hover:bg-slate-100 hover:text-blue-700"><Pencil size={16}/></Link><Link title="Voir le compte" aria-label="Voir le compte" href={`/dashboard/membres/${m.id}`} className="rounded p-1 hover:bg-slate-100 hover:text-blue-700"><UserRound size={16}/></Link><button title="Renvoyer la clé d’activation" aria-label="Renvoyer la clé d’activation" type="button" disabled={actioning === m.id} onClick={() => sendActivation(m)} className="rounded p-1 hover:bg-slate-100 hover:text-blue-700 disabled:opacity-50"><KeyRound size={16}/></button>{user?.role === 'ADMIN' && <button title={m.isSuspended ? 'Réactiver le compte' : 'Geler le compte'} aria-label={m.isSuspended ? 'Réactiver le compte' : 'Geler le compte'} className={`rounded p-1 hover:bg-slate-100 disabled:opacity-50 ${m.isSuspended ? 'text-emerald-600 hover:text-emerald-700' : 'text-amber-600 hover:text-amber-700'}`} type="button" disabled={actioning === m.id} onClick={() => toggleSuspension(m)}><PauseCircle size={16}/></button>}</div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {!loading && filtered.length === 0 && <p className="p-10 text-center text-slate-500">Aucun membre ne correspond à ce filtre.</p>}
    </section>
  </div>;
}

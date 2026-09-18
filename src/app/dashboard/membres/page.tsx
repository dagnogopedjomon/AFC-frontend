'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Pencil, UserRound, KeyRound, PauseCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE, authApi, membersApi, type Member } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { confirmAction } from '@/lib/swal';

const BUREAU = ['ADMIN','PRESIDENT','SECRETARY_GENERAL','TREASURER','COMMISSIONER','GENERAL_MEANS_MANAGER'];

function matches(member: Member, query: string) {
  const q = query.trim().toLowerCase();
  return !q || [member.firstName, member.lastName, member.phone, member.email ?? ''].join(' ').toLowerCase().includes(q);
}

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue'|'gray'|'green'|'amber'|'red' }) {
  const cls = {
    blue:  'afc-badge-blue border',
    gray:  'afc-badge-gray border',
    green: 'afc-badge-emerald border',
    amber: 'afc-badge-amber border',
    red:   'afc-badge-red border',
  }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
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

  useEffect(() => {
    if (!canList) { setLoading(false); return; }
    membersApi.list().then(setMembers).catch(() => setMembers([])).finally(() => setLoading(false));
  }, [canList]);

  async function toggleSuspension(member: Member) {
    const next = !member.isSuspended;
    const confirmation = await confirmAction(next ? 'Geler ce compte ?' : 'Réactiver ce compte ?', `${member.firstName} ${member.lastName}`);
    if (!confirmation.isConfirmed) return;
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

  if (!canList) return (
    <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-6">
      <h1 className="text-xl font-semibold text-[var(--afc-text)]">Membres</h1>
      <p className="mt-2 text-sm text-[var(--afc-muted)]">Accès réservé au bureau du club.</p>
    </div>
  );

  const countActive   = members.filter((m) => !m.isSuspended && m.role !== 'FORMER_PLAYER').length;
  const countProspects = members.filter((m) => m.membershipStatus === 'PROSPECT').length;
  const countLate     = members.filter((m) => !!m.isSuspended).length;
  const countInactive = members.filter((m) => m.role === 'FORMER_PLAYER').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Membres</h1>
          <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Liste &amp; suivi des joueurs du club</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/cotisations/paiement" className="afc-button-primary">
            <Plus size={15} strokeWidth={2} aria-hidden="true" /> Nouveau paiement
          </Link>
          {user?.role === 'ADMIN' && (
            <Link href="/dashboard/membres/new" className="btn-primary">
              <Plus size={15} strokeWidth={2} aria-hidden="true" /> Nouveau membre
            </Link>
          )}
        </div>
      </header>

      {params.get('created') === '1' && (
        <div className="rounded-xl border border-emerald-700/30 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-400">
          Compte créé avec succès.
        </div>
      )}

      {/* Filtres + recherche */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {([
            ['ALL',      `Tous (${members.length})`],
            ['ACTIVE',   `Actifs (${countActive})`],
            ['PROSPECT', `Prospects (${countProspects})`],
            ['LATE',     `En retard (${countLate})`],
            ['INACTIVE', `Inactifs (${countInactive})`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === value
                  ? 'bg-[#C9A048] text-[#171308]'
                  : 'text-[var(--afc-muted-2)] hover:bg-[rgba(var(--afc-hl),0.06)] hover:text-[var(--afc-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--afc-muted-3)]" size={15} strokeWidth={1.6} />
          <input
            aria-label="Rechercher un membre"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un membre…"
            className="afc-login-input w-full !py-2 !pl-9 text-sm"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <div className="overflow-x-auto">
          <table className="afc-table-dark w-full min-w-[1050px] text-left">
            <thead>
              <tr>
                {['Membre','Téléphone','Date adhésion','Statut','Septembre 2026','Compte','Actions'].map((col, i) => (
                  <th key={col} className={`px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]${i === 6 ? ' text-right' : ''}`}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center text-[var(--afc-muted)]">Chargement…</td></tr>
              ) : filtered.map((m) => {
                const former = m.role === 'FORMER_PLAYER';
                const bureau = BUREAU.includes(m.role) && m.role !== 'ADMIN';
                return (
                  <tr key={m.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {m.profilePhotoUrl
                          ? <img src={m.profilePhotoUrl.startsWith('http') ? m.profilePhotoUrl : API_BASE + m.profilePhotoUrl} className="h-8 w-8 rounded-full object-cover" alt="" />
                          : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--afc-avatar-bg)] text-xs font-semibold text-[var(--afc-avatar-text)]">{m.firstName[0]}{m.lastName[0]}</span>
                        }
                        <Link href={`/dashboard/membres/${m.id}`} className="font-medium text-[var(--afc-text)] transition hover:text-[#C9A048]">
                          {m.firstName} {m.lastName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[var(--afc-muted-2)]">{m.phone}</td>
                    <td className="px-5 py-3.5 text-xs text-[var(--afc-muted)]">{new Date(m.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={m.isSuspended ? 'red' : bureau ? 'gray' : former ? 'gray' : m.membershipStatus === 'PROSPECT' ? 'amber' : 'blue'}>
                        {m.isSuspended ? 'Inactif' : bureau ? 'Bureau' : former ? 'Inactif' : m.membershipStatus === 'PROSPECT' ? 'Prospect' : 'Actif'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5"><Badge tone={former ? 'gray' : 'blue'}>{former ? '—' : 'Payé'}</Badge></td>
                    <td className="px-5 py-3.5"><Badge tone={m.isSuspended ? 'red' : 'blue'}>{m.isSuspended ? 'Inactif' : 'Actif'}</Badge></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <Link title="Modifier le membre" aria-label="Modifier le membre" href={`/dashboard/membres/${m.id}`} className="rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.04)] p-1.5 text-[var(--afc-text-soft)] transition hover:border-[#C9A048]/40 hover:bg-[#C9A048]/10 hover:text-[#C9A048]"><Pencil size={15} strokeWidth={1.8}/></Link>
                        <Link title="Voir le compte" aria-label="Voir le compte" href={`/dashboard/membres/${m.id}`} className="rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.04)] p-1.5 text-[var(--afc-text-soft)] transition hover:border-[#C9A048]/40 hover:bg-[#C9A048]/10 hover:text-[#C9A048]"><UserRound size={15} strokeWidth={1.8}/></Link>
                        <button title="Renvoyer la clé d'activation" aria-label="Renvoyer la clé d'activation" type="button" disabled={actioning === m.id} onClick={() => sendActivation(m)} className="rounded-lg border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.04)] p-1.5 text-[var(--afc-text-soft)] transition hover:border-[#C9A048]/40 hover:bg-[#C9A048]/10 hover:text-[#C9A048] disabled:opacity-40"><KeyRound size={15} strokeWidth={1.8}/></button>
                        {user?.role === 'ADMIN' && (
                          <button
                            title={m.isSuspended ? 'Réactiver le compte' : 'Geler le compte'}
                            aria-label={m.isSuspended ? 'Réactiver le compte' : 'Geler le compte'}
                            className={`rounded-lg border p-1.5 transition disabled:opacity-40 ${m.isSuspended ? 'border-emerald-700/40 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/35' : 'border-amber-700/40 bg-amber-900/20 text-amber-400 hover:bg-amber-900/35'}`}
                            type="button"
                            disabled={actioning === m.id}
                            onClick={() => toggleSuspension(m)}
                          >
                            <PauseCircle size={15} strokeWidth={1.8}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <p className="p-10 text-center text-[var(--afc-muted)]">Aucun membre ne correspond à ce filtre.</p>
        )}
      </div>
    </div>
  );
}

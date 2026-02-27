'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { API_BASE, membersApi, type Member } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { memberRoleLabel } from '@/lib/utils';

const BUREAU_OR_ADMIN = [
  'ADMIN',
  'PRESIDENT',
  'SECRETARY_GENERAL',
  'TREASURER',
  'COMMISSIONER',
  'GENERAL_MEANS_MANAGER',
];

function isBureau(role: string) {
  return BUREAU_OR_ADMIN.includes(role);
}

function filterMembers(members: Member[], query: string): Member[] {
  if (!query.trim()) return members;
  const q = query.trim().toLowerCase();
  return members.filter(
    (m) =>
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      `${m.lastName} ${m.firstName}`.toLowerCase().includes(q) ||
      (m.phone && m.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))),
  );
}

function MemberRow({ m }: { m: Member }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {m.profilePhotoUrl ? (
            <img
              src={m.profilePhotoUrl.startsWith('http') ? m.profilePhotoUrl : `${API_BASE}${m.profilePhotoUrl}`}
              alt=""
              className="h-10 w-10 rounded-full object-cover bg-gray-100"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[var(--sky-blue-light)] flex items-center justify-center text-[var(--sky-blue-dark)] font-medium">
              {m.firstName[0]}
              {m.lastName[0]}
            </div>
          )}
          <Link
            href={`/dashboard/membres/${m.id}`}
            className="font-medium text-[var(--sky-blue-dark)] hover:underline"
          >
            {m.firstName} {m.lastName}
          </Link>
        </div>
      </td>
      <td className="px-6 py-4 text-gray-600">{m.phone}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.isSuspended ? 'bg-amber-100 text-amber-800' : 'bg-[var(--sky-blue-soft)] text-[var(--sky-blue-dark)]'}`}>
          {memberRoleLabel(m.role, !!m.isSuspended)}
        </span>
      </td>
      <td className="px-6 py-4">
        {m.profileCompleted ? (
          <span className="text-green-600 text-sm">Complété</span>
        ) : (
          <span className="text-amber-600 text-sm">À compléter</span>
        )}
      </td>
      <td className="px-6 py-4">
        {m.isSuspended ? (
          <span className="text-red-600 text-sm font-medium">Suspendu</span>
        ) : (
          <span className="text-green-600 text-sm">À jour</span>
        )}
      </td>
    </tr>
  );
}

export default function MembresPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const created = searchParams.get('created') === '1';

  const canListMembers = user && BUREAU_OR_ADMIN.includes(user.role);

  const filteredMembers = useMemo(() => filterMembers(members, searchQuery), [members, searchQuery]);
  const bureauMembers = useMemo(() => filteredMembers.filter((m) => isBureau(m.role)), [filteredMembers]);
  const otherMembers = useMemo(() => filteredMembers.filter((m) => !isBureau(m.role)), [filteredMembers]);

  useEffect(() => {
    if (!canListMembers) {
      setLoading(false);
      return;
    }
    membersApi
      .list()
      .then(setMembers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [canListMembers]);

  if (!canListMembers) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-2">
          Membres
        </h1>
        <p className="text-gray-600">
          L’accès à la liste des membres est réservé à l’Admin et au bureau du club.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Membres
          </h1>
          <p className="text-gray-600 mt-1">
            Liste des membres du club ({members.length} membre{members.length !== 1 ? 's' : ''})
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Link
            href="/dashboard/membres/new"
            className="btn-primary inline-flex items-center justify-center shrink-0"
          >
            Ajouter un membre
          </Link>
        )}
      </div>

      {(created || searchParams.get('invited') === '1') && (
        <div className="rounded-xl bg-green-50 text-green-800 px-4 py-3 text-sm">
          {searchParams.get('invited') === '1'
            ? 'Invitation envoyée.'
            : 'Compte créé. Le membre peut se connecter avec le téléphone et le mot de passe que vous avez définis.'}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card flex justify-center py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">
          Aucun membre pour le moment.
          {user?.role === 'ADMIN' && (
            <>{' '}
              <Link href="/dashboard/membres/new" className="text-[var(--sky-blue-dark)] hover:underline">
                Inviter le premier membre
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="search"
              placeholder="Rechercher un membre (nom, prénom, téléphone…)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-[var(--foreground)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--sky-blue)] focus:border-transparent"
              aria-label="Rechercher un membre"
            />
          </div>

          <div className="space-y-6">
            <div className="card overflow-hidden p-0">
              <div className="px-6 py-4 border-b border-gray-100 bg-[var(--sky-blue-soft)]">
                <h2 className="text-lg font-semibold text-[var(--sky-blue-dark)]">
                  Bureau du club
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {bureauMembers.length} membre{bureauMembers.length !== 1 ? 's' : ''} du bureau
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Membre</th>
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Téléphone</th>
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Rôle</th>
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Profil</th>
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bureauMembers.map((m) => (
                      <MemberRow key={m.id} m={m} />
                    ))}
                  </tbody>
                </table>
              </div>
              {bureauMembers.length === 0 && (
                <div className="py-10 text-center text-gray-500 text-sm">
                  {searchQuery.trim() ? 'Aucun membre du bureau ne correspond à la recherche.' : 'Aucun membre du bureau.'}
                </div>
              )}
            </div>

            <div className="card overflow-hidden p-0">
              <div className="px-6 py-4 border-b border-gray-100 bg-slate-50">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Autres membres
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {otherMembers.length} membre{otherMembers.length !== 1 ? 's' : ''} (membres, anciens membres, supporters)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Membre</th>
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Téléphone</th>
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Rôle</th>
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Profil</th>
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherMembers.map((m) => (
                      <MemberRow key={m.id} m={m} />
                    ))}
                  </tbody>
                </table>
              </div>
              {otherMembers.length === 0 && (
                <div className="py-10 text-center text-gray-500 text-sm">
                  {searchQuery.trim() ? 'Aucun autre membre ne correspond à la recherche.' : 'Aucun autre membre pour le moment.'}
                  {!searchQuery.trim() && user?.role === 'ADMIN' && (
                    <>{' '}
                      <Link href="/dashboard/membres/new" className="text-[var(--sky-blue-dark)] hover:underline">
                        Inviter un membre
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

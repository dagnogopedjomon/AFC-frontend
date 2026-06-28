'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { contributionsApi, type Contribution } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { JekoPayButton } from '@/components/JekoPayButton';

export default function CotisationExceptionnelleDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [contributors, setContributors] = useState<{
    payments: Array<{
      id: string;
      memberId: string;
      firstName: string;
      lastName: string;
      profilePhotoUrl: string | null;
      amount: number;
      paidAt: string;
    }>;
    allocations: object[];
    totalFromMembers: number;
    totalFromCashBox: number;
    total: number;
  } | null>(null);
  const [cashBoxes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [canAct, setCanAct] = useState(false);
  const [allocationAmount, setAllocationAmount] = useState('');
  const [allocationCashBox, setAllocationCashBox] = useState('');
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    if (!user) return;
    setCanAct(user.role === 'ADMIN' || user.role === 'TREASURER');
    load();
  }, [user, id]);

  async function load() {
    setLoading(true);
    try {
      const [c, cont] = await Promise.all([
        contributionsApi.one(id),
        contributionsApi.getContributors(id),
      ]);
      setContribution(c);
      setContributors(cont);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  async function handleClose(status: 'CLOSED_PENDING' | 'CLOSED_DELIVERED') {
    try {
      await contributionsApi.close(id, status);
      toast.success(status === 'CLOSED_DELIVERED' ? 'Cotisation clôturée et remise.' : 'Cotisation clôturée en attente de réception.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  }

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    if (!allocationAmount) return;
    setAllocating(true);
    try {
      await contributionsApi.allocate(id, {
        amount: Number(allocationAmount),
        fromCashBoxId: allocationCashBox || undefined,
        description: 'Allocation depuis la caisse',
      });
      toast.success('Allocation enregistrée.');
      setAllocationAmount('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setAllocating(false);
    }
  }

  if (loading || !contribution) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--sky-blue)]" />
      </div>
    );
  }

  const isClosed = contribution.status === 'CLOSED_DELIVERED';
  const isPending = contribution.status === 'CLOSED_PENDING';
  const isBeneficiary = user?.id === contribution.beneficiaryMemberId;
  const showContributors = !isBeneficiary || !isClosed;
  const deadline = contribution.deadline ? new Date(contribution.deadline) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/cotisations/exceptionnelles" className="text-[var(--sky-blue-dark)] hover:underline font-medium">← Cotisations exceptionnelles</Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mt-2">{contribution.name}</h1>
        {contribution.amount && !contribution.isOpenAmount && (
          <p className="text-gray-600 mt-1">Montant suggéré : {Number(contribution.amount).toLocaleString('fr-FR')} FCFA</p>
        )}
        {contribution.isOpenAmount && <p className="text-gray-600 mt-1">Montant libre</p>}
        {deadline && (
          <p className="text-sm font-medium mt-2 animate-blink-red">
            Clôture : {deadline.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        {isClosed && <p className="mt-2 text-gray-600 font-medium">Cette cotisation est clôturée et remise.</p>}
        {isPending && <p className="mt-2 text-amber-600 font-medium">Clôturée — en attente de réception par le bénéficiaire.</p>}
      </div>

      {canAct && (
        <div className="card">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Actions bureau</h2>
          <div className="flex flex-wrap gap-2">
            {contribution.status === 'OPEN' && (
              <button
                type="button"
                onClick={() => handleClose('CLOSED_PENDING')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
              >
                Clôturer — en attente de réception
              </button>
            )}
            {(contribution.status === 'OPEN' || contribution.status === 'CLOSED_PENDING') && (
              <button
                type="button"
                onClick={() => handleClose('CLOSED_DELIVERED')}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-medium hover:bg-gray-900"
              >
                Clôturé et remis
              </button>
            )}
          </div>

          <form onSubmit={handleAllocate} className="mt-4 grid gap-3 sm:grid-cols-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allouer depuis une caisse (FCFA)</label>
              <input
                type="number"
                className="input-field w-full"
                value={allocationAmount}
                onChange={(e) => setAllocationAmount(e.target.value)}
                placeholder="Montant"
              />
            </div>
            <div>
              <select
                className="input-field w-full"
                value={allocationCashBox}
                onChange={(e) => setAllocationCashBox(e.target.value)}
              >
                <option value="">Caisse par défaut</option>
                {cashBoxes.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={allocating} className="btn-primary disabled:opacity-60">
              {allocating ? '…' : 'Allouer'}
            </button>
          </form>
        </div>
      )}

      {contribution.status === 'OPEN' && (
        <div className="card">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Participer</h2>
          <JekoPayButton
            contributionId={contribution.id}
            amount={contribution.amount ? Number(contribution.amount) : 1000}
            label={contribution.amount ? `${Number(contribution.amount).toLocaleString('fr-FR')} FCFA` : 'Don libre'}
            onError={(msg) => toast.error(msg)}
          />
          {contribution.isOpenAmount && (
            <p className="text-xs text-gray-400 mt-2">Le montant final est à définir sur la page Jeko.</p>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          {isBeneficiary && isClosed ? 'Montant collecté' : 'Contributeurs'}
        </h2>
        {showContributors && contributors && contributors.payments.length > 0 ? (
          <div className="space-y-2">
            {contributors.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  {p.profilePhotoUrl ? (
                    <img src={p.profilePhotoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200" />
                  )}
                  <span className="font-medium text-[var(--foreground)]">{p.firstName} {p.lastName}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">{p.amount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            {isBeneficiary && isClosed
              ? `${contributors?.total.toLocaleString('fr-FR') ?? '0'} FCFA collectés.`
              : 'Aucun contributeur pour le moment.'}
          </p>
        )}
        {showContributors && contributors && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm text-gray-600">
            <p>Total membres : {contributors.totalFromMembers.toLocaleString('fr-FR')} FCFA</p>
            <p>Total caisse : {contributors.totalFromCashBox.toLocaleString('fr-FR')} FCFA</p>
            <p className="font-semibold text-[var(--foreground)]">Total : {contributors.total.toLocaleString('fr-FR')} FCFA</p>
          </div>
        )}
      </div>
    </div>
  );
}

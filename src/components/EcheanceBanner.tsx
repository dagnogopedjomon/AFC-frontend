'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';
import { contributionsApi } from '@/lib/api';

const DEADLINE_DAY = 10;

type Banner = { tone: 'afc-badge-amber' | 'afc-badge-red'; text: string; href: string; cta: string };

export function EcheanceBanner({ audience }: { audience: 'member' | 'bureau' }) {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    const daysLeft = DEADLINE_DAY - now.getDate();
    const deadlineText = daysLeft > 1 ? `dans ${daysLeft} jours` : daysLeft === 1 ? 'demain' : daysLeft === 0 ? 'aujourd’hui' : 'dépassée';
    const tone = daysLeft < 0 ? 'afc-badge-red' : 'afc-badge-amber';

    if (audience === 'member') {
      contributionsApi
        .meDebtSummary()
        .then((debt) => {
          const unpaid = debt.unpaidMonths;
          if (unpaid.length === 0) return setBanner(null);
          const older = unpaid.filter((m) => !(m.year === year && m.month === month));
          if (older.length > 0 || daysLeft < 0) {
            setBanner({
              tone: 'afc-badge-red',
              text: `Vous avez ${unpaid.length} mois de cotisation impayé${unpaid.length > 1 ? 's' : ''} (${debt.totalOwed.toLocaleString('fr-FR')} FCFA). Régularisez pour éviter ou lever la suspension de votre compte.`,
              href: '/dashboard/regulariser',
              cta: 'Régulariser',
            });
          } else {
            setBanner({
              tone,
              text: `Votre cotisation de ${monthLabel} est à régler avant le ${DEADLINE_DAY} (${deadlineText}).`,
              href: '/dashboard/regulariser',
              cta: 'Payer',
            });
          }
        })
        .catch(() => setBanner(null));
      return;
    }

    contributionsApi
      .arrears(year, month)
      .then((result) => {
        if (result.total === 0) return setBanner(null);
        const names = result.members.slice(0, 8).map((m) => `${m.firstName} ${m.lastName}`).join(', ');
        const more = result.total > 8 ? ` et ${result.total - 8} autre${result.total - 8 > 1 ? 's' : ''}` : '';
        setBanner({
          tone,
          text: `${result.total} membre${result.total > 1 ? 's' : ''} n’${result.total > 1 ? 'ont' : 'a'} pas encore payé la cotisation de ${monthLabel} — échéance le ${DEADLINE_DAY} (${deadlineText}) : ${names}${more}.`,
          href: '/dashboard/cotisations/mensuelle',
          cta: 'Voir',
        });
      })
      .catch(() => setBanner(null));
  }, [audience]);

  if (!banner) return null;
  const Icon = banner.tone === 'afc-badge-red' ? AlertTriangle : Clock;

  return (
    <div role="status" className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${banner.tone}`}>
      <Icon size={16} className="shrink-0" aria-hidden="true" />
      <div className="afc-marquee min-w-0 flex-1 overflow-hidden">
        <span className="afc-marquee-track font-medium">{banner.text}</span>
      </div>
      <Link href={banner.href} className="shrink-0 rounded-lg border border-current px-3 py-1 text-xs font-semibold transition hover:opacity-80">
        {banner.cta}
      </Link>
    </div>
  );
}

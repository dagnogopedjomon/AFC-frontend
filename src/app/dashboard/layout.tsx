'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  PiggyBank,
  BarChart3,
  CalendarDays,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { notificationsApi, caisseApi, activitiesApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const CAISSE_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];

// Redirection « Régulariser » désactivée pour l’instant (comptes actuels). Réactiver avec des comptes de test adaptés.

const baseNav = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/membres', label: 'Membres', icon: Users },
  { href: '/dashboard/cotisations', label: 'Cotisations', icon: PiggyBank },
  { href: '/dashboard/caisse', label: 'Caisse', icon: Wallet },
  { href: '/dashboard/rapports', label: 'Rapports', icon: BarChart3 },
  { href: '/dashboard/activites', label: 'Activités', icon: CalendarDays },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
  className = '',
  badge = 0,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        isActive
          ? 'bg-[var(--sky-blue)] text-white shadow-md'
          : 'text-[var(--sidebar-text-muted)] hover:bg-white/10 hover:text-[var(--sidebar-text)]',
        className,
      )}
    >
      <Icon className="shrink-0" size={20} />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {badge > 0 && (
        <span
          className={cn(
            'shrink-0 flex items-center justify-center rounded-full min-w-[1.25rem] h-5 px-1.5 text-xs font-bold',
            isActive ? 'bg-white/25 text-white' : 'bg-[var(--sky-blue)] text-white',
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inAppUnreadCount, setInAppUnreadCount] = useState(0);
  const [pendingTreasurer, setPendingTreasurer] = useState(0);
  const [pendingCommissioner, setPendingCommissioner] = useState(0);
  const [activitiesRecentCount, setActivitiesRecentCount] = useState(0);

  const nav = baseNav;

  const caisseBadge =
    user && CAISSE_ROLES.includes(user.role)
      ? user.role === 'TREASURER'
        ? pendingTreasurer
        : user.role === 'COMMISSIONER'
          ? pendingCommissioner
          : 0
      : 0;

  const refreshCaissePendingCount = () => {
    if (!user || !CAISSE_ROLES.includes(user.role)) return;
    caisseApi
      .pendingCount()
      .then((r) => {
        setPendingTreasurer(r.pendingTreasurer);
        setPendingCommissioner(r.pendingCommissioner);
      })
      .catch(() => {
        setPendingTreasurer(0);
        setPendingCommissioner(0);
      });
  };

  const refreshActivitiesRecentCount = () => {
    activitiesApi.recentCount()
      .then((r) => setActivitiesRecentCount(r.count))
      .catch(() => setActivitiesRecentCount(0));
  };

  const refreshInAppCount = () => {
    notificationsApi.inApp
      .unreadCount()
      .then((r) => setInAppUnreadCount(r.count))
      .catch(() => setInAppUnreadCount(0));
  };

  useEffect(() => {
    if (!user) return;
    refreshActivitiesRecentCount();
    const intervalActivities = setInterval(refreshActivitiesRecentCount, 60000);
    refreshInAppCount();
    const interval = setInterval(refreshInAppCount, 60000);
    return () => {
      clearInterval(interval);
      clearInterval(intervalActivities);
    };
  }, [user]);

  useEffect(() => {
    const handler = () => refreshInAppCount();
    window.addEventListener('notifications-inapp-updated', handler);
    return () => window.removeEventListener('notifications-inapp-updated', handler);
  }, []);

  useEffect(() => {
    const handler = () => refreshActivitiesRecentCount();
    window.addEventListener('activities-updated', handler);
    return () => window.removeEventListener('activities-updated', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshCaissePendingCount();
    const interval = setInterval(refreshCaissePendingCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = () => refreshCaissePendingCount();
    window.addEventListener('caisse-expenses-updated', handler);
    return () => window.removeEventListener('caisse-expenses-updated', handler);
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
    // L'admin reste sur le dashboard même sans profil complété.
    if (!loading && token && user && user.role !== 'ADMIN' && !user.profileCompleted)
      router.replace('/complete-profile');
  }, [loading, token, user, router]);

  if (loading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/30 to-white">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
      </div>
    );
  }

  if (user?.isSuspended && user.role !== 'ADMIN') {
    logout({ redirectTo: '/compte-suspendu' });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/30 to-white">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar — desktop */}
      <aside
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-slate-700/50"
        style={{ background: 'linear-gradient(180deg, var(--sidebar-bg) 0%, #1e293b 100%)' }}
      >
        <Link href="/dashboard" className="flex h-16 items-center justify-center gap-3 px-4 border-b border-slate-600/50">
          <img src="/images/afcimage.jpeg" alt="" className="h-12 w-12 shrink-0 object-cover rounded-xl" />
          <span className="text-lg font-bold text-[var(--sky-blue)] tracking-tight">AFC</span>
        </Link>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.href)}
              badge={
                item.href === '/dashboard/caisse'
                  ? caisseBadge
                  : item.href === '/dashboard/activites'
                    ? activitiesRecentCount
                    : item.href === '/dashboard/notifications'
                      ? inAppUnreadCount
                      : 0
              }
            />
          ))}
        </nav>
        <div className="p-3 border-t border-slate-600/50">
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--sidebar-text-muted)] hover:bg-red-500/20 hover:text-red-300 transition"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Header mobile */}
      <header
        className="lg:hidden sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-700/50 px-4"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="p-2 rounded-lg text-[var(--sidebar-text-muted)] hover:bg-white/10 hover:text-white transition"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Link href="/dashboard" className="flex items-center justify-center gap-2 min-w-0 flex-1">
          <img src="/images/afcimage.jpeg" alt="" className="h-9 w-9 shrink-0 object-cover rounded-lg" />
          <span className="text-base font-bold text-[var(--sky-blue)] truncate">AFC</span>
        </Link>
        <div className="w-10" />
      </header>

      {/* Drawer mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/20"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'lg:hidden fixed top-14 left-0 right-0 z-40 h-[calc(100vh-3.5rem)] overflow-y-auto transition-transform duration-200',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid rgba(100,116,139,0.3)' }}
      >
        <nav className="p-4 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.href)}
              onClick={() => setMobileMenuOpen(false)}
              badge={
                item.href === '/dashboard/caisse'
                  ? caisseBadge
                  : item.href === '/dashboard/activites'
                    ? activitiesRecentCount
                    : item.href === '/dashboard/notifications'
                      ? inAppUnreadCount
                      : 0
              }
            />
          ))}
        </nav>
        <div className="p-4 border-t border-slate-600/50">
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(false); logout(); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--sidebar-text-muted)] hover:bg-red-500/20 hover:text-red-300"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:pl-64 flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-white">
        {user?.isSuspended && user.role !== 'ADMIN' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-amber-800 text-sm font-medium">
            Votre cotisation n’est pas à jour. Accès en lecture seule jusqu’à régularisation.
          </div>
        )}
        {user && !user.isSuspended && user.reactivatedAt && user.role !== 'ADMIN' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-amber-800 text-sm font-medium">
            Vous avez été réactivé temporairement. Vous avez <strong>24 h</strong> pour régulariser votre cotisation, sinon votre compte sera désactivé à nouveau.{' '}
            <Link href="/dashboard/regulariser" className="underline font-semibold">Payer maintenant</Link>
          </div>
        )}
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      {/* Bottom navigation — mobile (4 principaux + Plus) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur py-2 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {nav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 min-w-[72px] transition touch-manipulation',
                active ? 'text-[var(--sky-blue-dark)] bg-[var(--sky-blue-soft)] font-medium' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium truncate max-w-[80px]">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            'flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 min-w-[72px] transition touch-manipulation',
            pathname !== '/dashboard' && nav.slice(4).some((item) => isActive(item.href))
              ? 'text-[var(--sky-blue-dark)] bg-[var(--sky-blue-soft)] font-medium'
              : 'text-slate-500 hover:text-slate-700',
          )}
          aria-label="Plus de menus"
        >
          <Menu size={22} />
          <span className="text-[10px] font-medium">Plus</span>
        </button>
      </nav>
    </div>
  );
}

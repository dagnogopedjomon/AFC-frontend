'use client';

import { useEffect, useRef, useState } from 'react';
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
  ChevronDown,
  Settings,
  Gavel,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { notificationsApi, caisseApi, activitiesApi } from '@/lib/api';
import { cn, roleLabelFr } from '@/lib/utils';
import { ConfirmModal } from '@/components/ConfirmModal';

const CAISSE_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];

// Redirection « Régulariser » désactivée pour l’instant (comptes actuels). Réactiver avec des comptes de test adaptés.

const baseNav = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/membres', label: 'Membres', icon: Users },
  { href: '/dashboard/caisse/depenses', label: 'Dépenses', icon: Wallet },
  { href: '/dashboard/amendes', label: 'Amendes', icon: Gavel },
];

const systemNav = [
  { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
];

const COTISATIONS_SUB = [
  { href: '/dashboard/cotisations/mensuelle', label: 'Cotisations mensuelles' },
  { href: '/dashboard/cotisations/exceptionnelles', label: 'Cotisations exceptionnelles' },
  { href: '/dashboard/cotisations/historique', label: 'Historique' },
];

const COTISATIONS_ADMIN_SUB = [
  { href: '/dashboard/cotisations/gerer', label: 'Gérer' },
  { href: '/dashboard/regularisations', label: 'Régularisations' },
  { href: '/dashboard/cotisations/paiement', label: 'Paiement déjà reçu' },
  { href: '/dashboard/exonerations', label: 'Mois exonérés' },
];

const CAISSE_SUB = [
  { href: '/dashboard/caisse', label: 'Vue d’ensemble', exact: true },
  { href: '/dashboard/caisse/livre', label: 'Livre de caisse', exact: false },
];

function NavGroupClient({
  label,
  icon: Icon,
  pathname,
  items,
  adminItems,
  isAdmin,
  onClick,
  collapsed = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  pathname: string;
  items: { href: string; label: string; exact?: boolean }[];
  adminItems?: { href: string; label: string; exact?: boolean }[];
  isAdmin?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  const allItems: { href: string; label: string; exact?: boolean }[] = [...items, ...(isAdmin && adminItems ? adminItems : [])];
  const isParentActive = allItems.some((item) =>
    item.exact ? pathname === item.href.split('#')[0] : pathname.startsWith(item.href.split('#')[0]),
  );
  const [open, setOpen] = useState(isParentActive);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
          collapsed && 'justify-center px-2',
          isParentActive
            ? 'bg-white text-[var(--sky-blue-dark)] shadow-sm'
            : 'text-[var(--sidebar-text-muted)] hover:bg-white hover:text-[var(--sidebar-text)]',
        )}
      >
        <Icon className="shrink-0" size={20} />
        {!collapsed && <span className="flex-1 min-w-0 truncate text-left">{label}</span>}
        {!collapsed && <ChevronDown size={16} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />}
      </button>
      {open && !collapsed && (
        <div className="mt-0.5 ml-8 space-y-0.5">
          {allItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClick}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                (item.exact ? pathname === item.href.split('#')[0] : pathname.startsWith(item.href.split('#')[0]))
                  ? 'bg-white text-[var(--sky-blue-dark)] shadow-sm'
                  : 'text-[var(--sidebar-text-muted)] hover:bg-white hover:text-[var(--sidebar-text)]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
  className = '',
  badge = 0,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
  badge?: number;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-white text-[var(--sky-blue-dark)] shadow-sm'
          : 'text-[var(--sidebar-text-muted)] hover:bg-white hover:text-[var(--sidebar-text)]',
        className,
      )}
    >
      <Icon className="shrink-0" size={20} />
      {!collapsed && <span className="flex-1 min-w-0 truncate">{label}</span>}
      {badge > 0 && !collapsed && (
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inAppUnreadCount, setInAppUnreadCount] = useState(0);
  const [pendingTreasurer, setPendingTreasurer] = useState(0);
  const [pendingCommissioner, setPendingCommissioner] = useState(0);
  const [activitiesRecentCount, setActivitiesRecentCount] = useState(0);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem('afc_sidebar_collapsed') === '1');
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem('afc_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  };

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
    // Les membres suspendus vont vers regulariser même si profil non complété.
    if (!loading && token && user && user.role !== 'ADMIN' && !user.profileCompleted && !user.isSuspended)
      router.replace('/complete-profile');
  }, [loading, token, user, router]);

  if (loading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/30 to-white">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
      </div>
    );
  }

  if (user?.isSuspended && user.role !== 'ADMIN' && pathname !== '/dashboard/regulariser') {
    router.replace('/dashboard/regulariser');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar — desktop */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-[#d2dae3] transition-[width] duration-200 overflow-hidden',
          sidebarCollapsed ? 'lg:w-[76px] [&_p]:hidden [&_span]:hidden [&_button]:justify-center [&_button]:px-2 [&_button>svg:last-child]:hidden [&_a]:justify-center [&_a]:px-2' : 'lg:w-72',
        )}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <Link href="/dashboard" className="flex h-20 items-center gap-3 px-5 border-b border-[#d2dae3]">
          <img src="/images/logo-afc.png" alt="Amicale Football Club" className="h-14 w-12 shrink-0 object-contain" />
          {!sidebarCollapsed && <div><span className="block text-base font-bold text-[var(--foreground)] tracking-tight">Amicale FC</span><span className="text-[11px] text-slate-500">Trésorerie du club</span></div>}
        </Link>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Pilotage</p>
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.href)}
              badge={item.href === '/dashboard/activites' ? activitiesRecentCount : 0}
            />
          ))}
          <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Cotisations</p>
          <NavGroupClient
            label="Cotisations"
            icon={PiggyBank}
            pathname={pathname}
            items={COTISATIONS_SUB}
            adminItems={COTISATIONS_ADMIN_SUB}
            isAdmin={user?.role === 'ADMIN' || user?.role === 'TREASURER' || user?.role === 'COMMISSIONER'}
          />
          <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Trésorerie</p>
          <NavGroupClient
            label="Caisse"
            icon={Wallet}
            pathname={pathname}
            items={CAISSE_SUB}
            adminItems={[]}
            isAdmin={false}
          />
          <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Système</p>
          {systemNav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} isActive={isActive(item.href)} />
          ))}
          <NavLink
            href="/dashboard/notifications"
            label="Notifications"
            icon={Bell}
            isActive={isActive('/dashboard/notifications')}
            badge={inAppUnreadCount}
          />
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/70 p-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dbe7f5] text-xs font-bold text-[#315f9e]">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
            {!sidebarCollapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p><p className="truncate text-[11px] text-slate-500">{user?.email || roleLabelFr(user?.role || '')}</p></div>}
            {!sidebarCollapsed && <Link href={user?.id ? `/dashboard/membres/${user.id}` : '/dashboard/parametres'} title="Gérer mon compte" aria-label="Gérer mon compte" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-700"><KeyRound size={16} /></Link>}
            <button type="button" onClick={() => setLogoutOpen(true)} title="Déconnexion" aria-label="Déconnexion" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* Header mobile */}
      <header
        className="lg:hidden sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 px-4 shadow-sm"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="p-2 rounded-lg text-[var(--sidebar-text-muted)] hover:bg-white transition"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Link href="/dashboard" className="flex items-center justify-center gap-2 min-w-0 flex-1">
          <img src="/images/logo-afc.png" alt="Amicale Football Club" className="h-11 w-9 shrink-0 object-contain" />
          <span className="text-base font-bold text-[var(--foreground)] truncate">Amicale FC</span>
        </Link>
        <Link
          href="/dashboard/notifications"
          className="relative p-2 rounded-lg text-[var(--sidebar-text-muted)] hover:bg-white transition"
          aria-label="Notifications"
        >
          <Bell size={22} />
          {inAppUnreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {inAppUnreadCount > 99 ? '99+' : inAppUnreadCount}
            </span>
          )}
        </Link>
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
          'lg:hidden fixed top-16 left-0 right-0 z-40 h-[calc(100vh-4rem)] overflow-y-auto transition-transform duration-200',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid #e2e8f0' }}
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
              badge={item.href === '/dashboard/activites' ? activitiesRecentCount : 0}
            />
          ))}
          <NavGroupClient
            label="Cotisations"
            icon={PiggyBank}
            pathname={pathname}
            items={COTISATIONS_SUB}
            adminItems={COTISATIONS_ADMIN_SUB}
            isAdmin={user?.role === 'ADMIN' || user?.role === 'TREASURER' || user?.role === 'COMMISSIONER'}
            onClick={() => setMobileMenuOpen(false)}
          />
          <NavGroupClient
            label="Caisse"
            icon={Wallet}
            pathname={pathname}
            items={CAISSE_SUB}
            adminItems={[]}
            isAdmin={false}
            onClick={() => setMobileMenuOpen(false)}
          />
          <NavLink
            href="/dashboard/parametres"
            label="Paramètres"
            icon={Settings}
            isActive={isActive('/dashboard/parametres')}
            onClick={() => setMobileMenuOpen(false)}
          />
          <NavLink
            href="/dashboard/notifications"
            label="Notifications"
            icon={Bell}
            isActive={isActive('/dashboard/notifications')}
            onClick={() => setMobileMenuOpen(false)}
            badge={inAppUnreadCount}
          />
        </nav>
        <div className="p-4 border-t border-slate-600/50">
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(false); setLogoutOpen(true); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--sidebar-text-muted)] hover:bg-red-500/20 hover:text-red-300"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>

      <ConfirmModal
        open={logoutOpen}
        title="Se déconnecter ?"
        message="Voulez-vous vraiment fermer votre session ?"
        confirmLabel="Se déconnecter"
        cancelLabel="Rester connecté"
        danger
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { setLogoutOpen(false); logout(); }}
      />

      {/* Main content */}
      <main className={cn('flex-1 flex flex-col min-h-screen bg-[#f7f9fb] transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-72')}>
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Afficher la barre latérale' : 'Réduire la barre latérale'}
          aria-label={sidebarCollapsed ? 'Afficher la barre latérale' : 'Réduire la barre latérale'}
          className="fixed top-4 z-30 hidden h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[var(--sky-blue)] hover:text-[var(--sky-blue)] lg:grid"
          style={{ left: sidebarCollapsed ? '92px' : '304px' }}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        {user && !user.isSuspended && user.reactivatedAt && user.role !== 'ADMIN' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-amber-800 text-sm font-medium">
            Vous avez été réactivé temporairement. Vous avez <strong>24 h</strong> pour régulariser votre cotisation, sinon votre compte sera désactivé à nouveau.{' '}
            <Link href="/dashboard/regulariser" className="underline font-semibold">Payer maintenant</Link>
          </div>
        )}
        <div
          className={cn('flex-1 w-full px-4 py-6 pb-24 sm:px-6 lg:pb-10 xl:px-10', sidebarCollapsed ? 'lg:pl-20' : 'lg:px-8')}
          style={sidebarCollapsed ? { paddingLeft: '80px' } : undefined}
        >
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

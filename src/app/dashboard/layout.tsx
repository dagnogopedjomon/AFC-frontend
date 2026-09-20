'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  PiggyBank,
  Landmark,
  BarChart3,
  CalendarDays,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  Gavel,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { notificationsApi, caisseApi, activitiesApi } from '@/lib/api';
import { cn, roleLabelFr } from '@/lib/utils';
import { ConfirmModal } from '@/components/ConfirmModal';

const CAISSE_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];
const BUREAU_OR_ADMIN = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];
const FINES_ROLES = ['ADMIN', 'TREASURER'];

// Redirection « Régulariser » désactivée pour l’instant (comptes actuels). Réactiver avec des comptes de test adaptés.

const baseNav = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/membres', label: 'Membres', icon: Users, roles: BUREAU_OR_ADMIN },
  { href: '/dashboard/caisse/depenses', label: 'Dépenses', icon: Wallet, roles: CAISSE_ROLES },
  { href: '/dashboard/amendes', label: 'Amendes', icon: Gavel, roles: FINES_ROLES },
];

const systemNav = [
  { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
];

const COTISATIONS_SUB = [
  { href: '/dashboard/cotisations/mensuelle', label: 'Cotisations mensuelles' },
  { href: '/dashboard/cotisations/exceptionnelles', label: 'Cotisations exceptionnelles' },
];

const COTISATIONS_ADMIN_SUB = [
  { href: '/dashboard/cotisations/historique', label: 'Historique' },
  { href: '/dashboard/cotisations/gerer', label: 'Gérer' },
  { href: '/dashboard/regularisations', label: 'Régularisations' },
  { href: '/dashboard/cotisations/paiement', label: 'Paiement déjà reçu' },
  { href: '/dashboard/exonerations', label: 'Mois exonérés' },
];

const CAISSE_SUB = [
  { href: '/dashboard/caisse', label: 'Vue d’ensemble', exact: true },
  { href: '/dashboard/caisse/livre', label: 'Livre de caisse', exact: false },
];

const memberNav = [
  { href: '/dashboard/mes-cotisations', label: 'Mes cotisations', icon: Wallet },
  { href: '/dashboard/mes-amendes', label: 'Mes amendes', icon: Gavel },
  { href: '/dashboard/caisse/livre', label: 'La caisse du club', icon: Landmark },
];

const BREADCRUMB_LABELS: { href: string; label: string }[] = [
  ...baseNav,
  ...systemNav,
  ...COTISATIONS_SUB,
  ...COTISATIONS_ADMIN_SUB,
  ...CAISSE_SUB,
  ...memberNav,
  { href: '/dashboard/membres/new', label: 'Nouveau membre' },
  { href: '/dashboard/notifications', label: 'Notifications' },
  { href: '/dashboard/regulariser', label: 'Régulariser' },
  { href: '/dashboard/activites', label: 'Activités' },
  { href: '/dashboard/regularisations', label: 'Régularisations' },
].sort((a, b) => b.href.length - a.href.length);

function breadcrumbLabel(pathname: string): string {
  const match = BREADCRUMB_LABELS.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  return match?.label ?? 'Détail';
}

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
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
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
            ? 'border border-[#C9A048]/50 text-[#C9A048] bg-[#C9A048]/[0.08]'
            : 'border border-transparent text-[var(--afc-text-soft)] hover:bg-[rgba(var(--afc-hl),0.06)] hover:text-[var(--afc-text)]',
        )}
      >
        <Icon className="shrink-0" size={19} strokeWidth={1.6} />
        {!collapsed && <span className="flex-1 min-w-0 truncate text-left">{label}</span>}
        {!collapsed && <ChevronDown size={15} strokeWidth={1.8} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />}
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
                  ? 'bg-[#C9A048] text-[#171308]'
                  : 'text-[var(--afc-text-soft)] hover:bg-[rgba(var(--afc-hl),0.06)] hover:text-[var(--afc-text)]',
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
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
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
          ? 'bg-[#C9A048] text-[#171308]'
          : 'text-[var(--afc-text-soft)] hover:bg-[rgba(var(--afc-hl),0.06)] hover:text-[var(--afc-text)]',
        className,
      )}
    >
      <Icon className="shrink-0" size={19} strokeWidth={1.6} />
      {!collapsed && <span className="flex-1 min-w-0 truncate">{label}</span>}
      {badge > 0 && !collapsed && (
        <span
          className={cn(
            'shrink-0 flex items-center justify-center rounded-full min-w-[1.25rem] h-5 px-1.5 text-xs font-bold',
            isActive ? 'bg-black/20 text-[#171308]' : 'bg-[#2E5FA3] text-white',
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem('afc_sidebar_collapsed') === '1');
    const storedTheme = window.localStorage.getItem('afc_theme');
    if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('afc_theme', next);
      return next;
    });
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem('afc_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  };

  const isBureauOrAdmin = !!user && BUREAU_OR_ADMIN.includes(user.role);
  const nav = [
    ...baseNav.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
    ...(user && !isBureauOrAdmin ? memberNav : []),
  ];
  const canViewCaisse = !!user && CAISSE_ROLES.includes(user.role);

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
    <div data-theme={theme} className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar — desktop (toujours sombre, indépendante du thème clair/sombre du contenu) */}
      <aside
        data-theme="dark"
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-[width] duration-200 overflow-hidden',
          sidebarCollapsed ? 'lg:w-[76px] [&_p]:hidden [&_span]:hidden [&_button]:justify-center [&_button]:px-2 [&_button>svg:last-child]:hidden [&_a]:justify-center [&_a]:px-2' : 'lg:w-72',
        )}
        style={{ background: 'var(--afc-sidebar)' }}
      >
        <Link href="/dashboard" className="flex h-20 items-center gap-3 px-5">
          <img src="/images/logo-afc.png" alt="Amicale Football Club" className="h-[68px] w-[58px] shrink-0 object-contain" />
          {!sidebarCollapsed && <div><span className="block text-base font-bold text-[var(--afc-text)] tracking-tight">Amicale FC</span><span className="text-[11px] text-[var(--afc-muted)]">Trésorerie du club</span></div>}
        </Link>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--afc-muted-3)]">Pilotage</p>
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
          <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--afc-muted-3)]">Cotisations</p>
          <NavGroupClient
            label="Cotisations"
            icon={PiggyBank}
            pathname={pathname}
            items={COTISATIONS_SUB}
            adminItems={COTISATIONS_ADMIN_SUB}
            isAdmin={user?.role === 'ADMIN' || user?.role === 'TREASURER' || user?.role === 'COMMISSIONER'}
          />
          {canViewCaisse && (
            <>
              <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--afc-muted-3)]">Trésorerie</p>
              <NavGroupClient
                label="Caisse"
                icon={Wallet}
                pathname={pathname}
                items={CAISSE_SUB}
                adminItems={[]}
                isAdmin={false}
              />
            </>
          )}
          <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--afc-muted-3)]">Système</p>
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
        <div className="border-t border-[rgba(var(--afc-hl),0.08)] p-3">
          <div className="flex items-center gap-2 rounded-lg bg-[rgba(var(--afc-hl),0.04)] p-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--afc-avatar-bg)] text-xs font-bold text-[var(--afc-avatar-text)]">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
            {!sidebarCollapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--afc-text)]">{user?.firstName} {user?.lastName}</p><p className="truncate text-[11px] text-[var(--afc-muted)]">{user?.email || roleLabelFr(user?.role || '')}</p></div>}
            {!sidebarCollapsed && <Link href={user?.id ? `/dashboard/membres/${user.id}` : '/dashboard/parametres'} title="Gérer mon compte" aria-label="Gérer mon compte" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-[rgba(var(--afc-hl),0.03)] text-[var(--afc-muted-4)] hover:bg-[rgba(var(--afc-hl),0.08)] hover:text-[var(--afc-text)]"><KeyRound size={16} /></Link>}
            <button type="button" onClick={toggleTheme} title={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'} aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-[rgba(var(--afc-hl),0.03)] text-[var(--afc-muted-4)] hover:bg-[rgba(var(--afc-hl),0.08)] hover:text-[#C9A048]">{theme === 'dark' ? <Sun size={16} strokeWidth={1.6} /> : <Moon size={16} strokeWidth={1.6} />}</button>
            <button type="button" onClick={() => setLogoutOpen(true)} title="Déconnexion" aria-label="Déconnexion" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-[rgba(var(--afc-hl),0.03)] text-[var(--afc-muted-4)] hover:bg-red-500/10 hover:text-red-300"><LogOut size={16} strokeWidth={1.6} /></button>
          </div>
        </div>
      </aside>

      {/* Header mobile (toujours sombre) */}
      <header
        data-theme="dark"
        className="lg:hidden sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[rgba(var(--afc-hl),0.08)] px-4"
        style={{ background: 'var(--afc-sidebar)' }}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="p-2 rounded-lg text-[var(--afc-text-soft)] hover:bg-[rgba(var(--afc-hl),0.06)] transition"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={22} strokeWidth={1.7} /> : <Menu size={22} strokeWidth={1.7} />}
        </button>
        <Link href="/dashboard" className="flex items-center justify-center gap-2 min-w-0 flex-1">
          <img src="/images/logo-afc.png" alt="Amicale Football Club" className="h-11 w-9 shrink-0 object-contain" />
          <span className="text-base font-bold text-[var(--afc-text)] truncate">Amicale FC</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--afc-text-soft)] hover:bg-[rgba(var(--afc-hl),0.06)] transition"
            aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
          >
            {theme === 'dark' ? <Sun size={20} strokeWidth={1.6} /> : <Moon size={20} strokeWidth={1.6} />}
          </button>
          <Link
            href="/dashboard/notifications"
            className="relative p-2 rounded-lg text-[var(--afc-text-soft)] hover:bg-[rgba(var(--afc-hl),0.06)] transition"
            aria-label="Notifications"
          >
            <Bell size={21} strokeWidth={1.6} />
            {inAppUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {inAppUnreadCount > 99 ? '99+' : inAppUnreadCount}
              </span>
            )}
          </Link>
        </div>
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
        data-theme="dark"
        className={cn(
          'lg:hidden fixed top-16 left-0 right-0 z-40 h-[calc(100vh-4rem)] overflow-y-auto transition-transform duration-200',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'var(--afc-sidebar)', borderRight: '1px solid rgba(var(--afc-hl),0.08)' }}
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
          {canViewCaisse && (
            <NavGroupClient
              label="Caisse"
              icon={Wallet}
              pathname={pathname}
              items={CAISSE_SUB}
              adminItems={[]}
              isAdmin={false}
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
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
        <div className="p-4 border-t border-[rgba(var(--afc-hl),0.08)]">
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(false); setLogoutOpen(true); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--afc-text-soft)] hover:bg-red-500/20 hover:text-red-300"
          >
            <LogOut size={19} strokeWidth={1.6} />
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
      <main className={cn('flex-1 flex flex-col min-h-screen bg-[var(--afc-bg)] text-[var(--afc-text)] transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-72')}>
        {pathname === '/dashboard' ? (
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Afficher la barre latérale' : 'Réduire la barre latérale'}
            aria-label={sidebarCollapsed ? 'Afficher la barre latérale' : 'Réduire la barre latérale'}
            className="fixed top-4 z-30 hidden h-9 w-9 place-items-center rounded-lg border border-white/10 bg-[var(--afc-card)] text-[var(--afc-muted-4)] shadow-sm transition hover:border-[#C9A048] hover:text-[#C9A048] lg:grid"
            style={{ left: sidebarCollapsed ? '92px' : '304px' }}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.6} /> : <PanelLeftClose size={16} strokeWidth={1.6} />}
          </button>
        ) : (
          <div className="sticky top-0 z-20 hidden h-16 items-center gap-3 border-b border-[var(--afc-border)] bg-[var(--afc-bg)] px-6 lg:flex">
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Afficher la barre latérale' : 'Réduire la barre latérale'}
              aria-label={sidebarCollapsed ? 'Afficher la barre latérale' : 'Réduire la barre latérale'}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--afc-muted)] transition hover:bg-[rgba(var(--afc-hl),0.06)] hover:text-[#C9A048]"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} strokeWidth={1.6} /> : <PanelLeftClose size={18} strokeWidth={1.6} />}
            </button>
            <span className="text-[15px] text-[var(--afc-muted)]">Amicale FC</span>
            <span className="select-none text-[15px] text-[#3A3F4C]">/</span>
            <span className="text-[15px] font-medium text-[var(--afc-text)]">{breadcrumbLabel(pathname)}</span>
          </div>
        )}
        {user && !user.isSuspended && user.reactivatedAt && user.role !== 'ADMIN' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-amber-800 text-sm font-medium">
            Vous avez été réactivé temporairement. Vous avez <strong>24 h</strong> pour régulariser votre cotisation, sinon votre compte sera désactivé à nouveau.{' '}
            <Link href="/dashboard/regulariser" className="underline font-semibold">Payer maintenant</Link>
          </div>
        )}
        <div className={cn('dashboard-content-offset flex-1 w-full px-4 py-6 pb-24 sm:px-6 lg:pb-10 xl:px-10', sidebarCollapsed ? 'lg:pl-20' : 'lg:px-8')}>
          {children}
        </div>
      </main>

      {/* Bottom navigation — mobile (4 principaux + Plus) */}
      <nav data-theme="dark" className="lg:hidden fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t border-[rgba(var(--afc-hl),0.08)] bg-[var(--afc-sidebar)]/95 backdrop-blur py-2 safe-area-pb">
        {nav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 min-w-[72px] transition touch-manipulation',
                active ? 'text-[#171308] bg-[#C9A048] font-medium' : 'text-[var(--afc-muted-4)] hover:text-[var(--afc-text)]',
              )}
            >
              <Icon size={21} strokeWidth={1.6} />
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
              ? 'text-[#171308] bg-[#C9A048] font-medium'
              : 'text-[var(--afc-muted-4)] hover:text-[var(--afc-text)]',
          )}
          aria-label="Plus de menus"
        >
          <Menu size={21} strokeWidth={1.6} />
          <span className="text-[10px] font-medium">Plus</span>
        </button>
      </nav>
    </div>
  );
}

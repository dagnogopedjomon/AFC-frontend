'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarOff,
  FileSpreadsheet,
  FileText,
  Newspaper,
  Gavel,
  HandCoins,
  History,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { notificationsApi, caisseApi, activitiesApi } from '@/lib/api';
import { cn, roleLabelFr } from '@/lib/utils';
import { ConfirmModal } from '@/components/ConfirmModal';

const CAISSE_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];
const BUREAU_OR_ADMIN = ['ADMIN', 'PRESIDENT', 'SECRETARY_GENERAL', 'TREASURER', 'COMMISSIONER', 'GENERAL_MEANS_MANAGER'];
const FINES_ROLES = ['ADMIN', 'TREASURER'];

// Redirection « Régulariser » désactivée pour l’instant (comptes actuels). Réactiver avec des comptes de test adaptés.

const COTISATIONS_ADMIN = ['ADMIN', 'TREASURER', 'COMMISSIONER'];

type NavEntry = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  roles?: string[];
  exact?: boolean;
  badge?: 'activites' | 'notifications' | 'caisse';
};

type NavGroup = { label: string; entries: NavEntry[] };

/** Menu de gestion — groupes, libellés et icônes du dossier d'intégration (5.1 et 5.4). */
const GESTION_NAV: NavGroup[] = [
  {
    label: 'Pilotage',
    entries: [
      { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
      { href: '/dashboard/membres', label: 'Membres', icon: UsersRound, roles: BUREAU_OR_ADMIN },
      { href: '/dashboard/activites', label: 'Activités', icon: Megaphone, badge: 'activites' },
      { href: '/dashboard/documents', label: 'Documents', icon: FileText },
      { href: '/dashboard/articles', label: 'Articles', icon: Newspaper },
      { href: '/dashboard/amendes', label: 'Amendes', icon: Gavel, roles: FINES_ROLES },
    ],
  },
  {
    label: 'Caisse',
    entries: [
      { href: '/dashboard/caisse', label: 'Vue d’ensemble', icon: Landmark, exact: true, roles: CAISSE_ROLES },
      { href: '/dashboard/caisse/depenses', label: 'Dépenses', icon: Receipt, roles: CAISSE_ROLES, badge: 'caisse' },
      { href: '/dashboard/caisse/livre', label: 'Livre de caisse', icon: BookOpen },
    ],
  },
  {
    label: 'Cotisations',
    entries: [
      { href: '/dashboard/cotisations/mensuelle', label: 'Cotisations mensuelles', icon: Calendar },
      { href: '/dashboard/cotisations/exceptionnelles', label: 'Cotisations exceptionnelles', icon: Sparkles },
      { href: '/dashboard/cotisations/historique', label: 'Historique', icon: History, roles: COTISATIONS_ADMIN },
      { href: '/dashboard/regularisations', label: 'Régularisations', icon: HandCoins, roles: COTISATIONS_ADMIN },
      { href: '/dashboard/exonerations', label: 'Mois exonérés', icon: CalendarOff, roles: COTISATIONS_ADMIN },
      { href: '/dashboard/cotisations/gerer', label: 'Gérer les cotisations', icon: FileSpreadsheet, roles: COTISATIONS_ADMIN },
      { href: '/dashboard/cotisations/paiement', label: 'Paiement déjà reçu', icon: Banknote, roles: COTISATIONS_ADMIN },
    ],
  },
  {
    label: 'Système',
    entries: [
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
      { href: '/dashboard/rapports', label: 'Rapports', icon: BarChart3, roles: COTISATIONS_ADMIN },
      { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
];

/** Espace membre — un seul groupe (5.2). */
const MEMBRE_NAV: NavGroup[] = [
  {
    label: 'Mon espace',
    entries: [
      { href: '/dashboard', label: 'Mon profil', icon: UserRound, exact: true },
      { href: '/dashboard/mes-cotisations', label: 'Mes cotisations', icon: CalendarCheck },
      { href: '/dashboard/mes-amendes', label: 'Mes amendes', icon: Gavel },
      { href: '/dashboard/caisse/livre', label: 'La caisse du club', icon: ArrowLeftRight },
      { href: '/dashboard/activites', label: 'Activités', icon: Megaphone, badge: 'activites' },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
      { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
];

/** Titres et sous-titres de page (5.3). */
const PAGE_TITLES: { href: string; title: string; subtitle: string; exact?: boolean }[] = [
  { href: '/dashboard', title: 'Tableau de bord', subtitle: 'Vue d’ensemble', exact: true },
  { href: '/dashboard/membres/new', title: 'Nouveau membre', subtitle: 'Créer un compte de joueur' },
  { href: '/dashboard/membres/voir', title: 'Fiche membre', subtitle: 'Profil, cotisations et historique' },
  { href: '/dashboard/membres', title: 'Membres', subtitle: 'Liste & suivi des joueurs du club' },
  { href: '/dashboard/caisse/depenses', title: 'Dépenses', subtitle: 'Sorties de caisse' },
  { href: '/dashboard/caisse/nouvelle-depense', title: 'Nouvelle dépense', subtitle: 'Demande de sortie de caisse' },
  { href: '/dashboard/caisse/livre', title: 'La caisse du club', subtitle: 'Entrées et sorties de l’association' },
  { href: '/dashboard/caisse', title: 'Caisse', subtitle: 'Soldes, dépenses et validations', exact: true },
  { href: '/dashboard/amendes', title: 'Amendes', subtitle: 'Obligations de paiement des membres' },
  { href: '/dashboard/mes-amendes', title: 'Mes amendes', subtitle: 'Réglées et en cours' },
  { href: '/dashboard/mes-cotisations', title: 'Mes cotisations', subtitle: 'Mensuelles et exceptionnelles' },
  { href: '/dashboard/cotisations/mensuelle', title: 'Cotisations mensuelles', subtitle: 'Suivi mois par mois' },
  { href: '/dashboard/cotisations/exceptionnelles', title: 'Cotisations exceptionnelles', subtitle: 'Événements, projets, urgences' },
  { href: '/dashboard/cotisations/historique', title: 'Historique', subtitle: 'Tous les paiements enregistrés' },
  { href: '/dashboard/cotisations/gerer', title: 'Gérer les cotisations', subtitle: 'Montants et cotisations ouvertes' },
  { href: '/dashboard/cotisations/paiement', title: 'Paiement déjà reçu', subtitle: 'Enregistrer un versement hors application' },
  { href: '/dashboard/regularisations', title: 'Régularisations', subtitle: 'Accords avec les membres en retard' },
  { href: '/dashboard/regulariser', title: 'Régulariser', subtitle: 'Solder votre retard de cotisation' },
  { href: '/dashboard/exonerations', title: 'Mois exonérés', subtitle: 'Mois sans cotisation due' },
  { href: '/dashboard/notifications', title: 'Notifications', subtitle: 'Messages du bureau et historique' },
  { href: '/dashboard/rapports', title: 'Rapports', subtitle: 'Synthèses annuelles du club' },
  { href: '/dashboard/parametres', title: 'Paramètres', subtitle: 'Configuration du club et de l’application' },
  { href: '/dashboard/activites', title: 'Activités', subtitle: 'Vie du club, matchs et annonces' },
  { href: '/dashboard/documents', title: 'Documents', subtitle: 'Fichiers à télécharger sur le site du club' },
  { href: '/dashboard/articles/editeur', title: 'Article', subtitle: 'Rédaction, aperçu et parution' },
  { href: '/dashboard/articles', title: 'Articles', subtitle: 'Le blog du club : communiqués et comptes rendus' },
  { href: '/dashboard/payment/success', title: 'Paiement', subtitle: 'Retour du paiement mobile' },
].sort((a, b) => b.href.length - a.href.length);

function pageTitle(pathname: string): { title: string; subtitle: string } {
  const match = PAGE_TITLES.find((item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/'),
  );
  return match ? { title: match.title, subtitle: match.subtitle } : { title: 'Amicale FC', subtitle: '' };
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
        'flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium transition',
        collapsed && 'justify-center',
        isActive
          ? 'bg-[var(--sidebar-accent)] text-[var(--afc-text)] shadow-sm'
          : 'text-[var(--afc-text)] hover:bg-[var(--sidebar-accent)]',
        className,
      )}
    >
      <Icon
        className={cn('shrink-0', isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]')}
        size={16}
        strokeWidth={1.7}
      />
      {!collapsed && <span className="flex-1 min-w-0 truncate">{label}</span>}
      {badge > 0 && !collapsed && (
        <span
          className={cn(
            'shrink-0 flex items-center justify-center rounded-full min-w-[1.25rem] h-5 px-1.5 text-xs font-bold',
            'bg-[var(--primary)] text-[var(--primary-foreground)]',
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
  const rawPathname = usePathname();
  // L'export statique ajoute un slash final (trailingSlash) : on le retire pour que les comparaisons de route restent fiables.
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/$/, '') : rawPathname;
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inAppUnreadCount, setInAppUnreadCount] = useState(0);
  const [pendingTreasurer, setPendingTreasurer] = useState(0);
  const [pendingCommissioner, setPendingCommissioner] = useState(0);
  const [activitiesRecentCount, setActivitiesRecentCount] = useState(0);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem('afc_sidebar_collapsed') === '1');
    const storedTheme = window.localStorage.getItem('afc-theme') ?? window.localStorage.getItem('afc_theme');
    if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);
  }, []);

  // Ctrl/Cmd + B replie ou ouvre le menu (4.1).
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setSidebarCollapsed((collapsed) => {
          const next = !collapsed;
          window.localStorage.setItem('afc_sidebar_collapsed', next ? '1' : '0');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('afc-theme', next);
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
  // Les deux univers sont étanches (4.4) : gestion d'un côté, espace membre de l'autre.
  const navGroups: NavGroup[] = (isBureauOrAdmin ? GESTION_NAV : MEMBRE_NAV)
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => !entry.roles || (user && entry.roles.includes(user.role))),
    }))
    .filter((group) => group.entries.length > 0);
  const flatNav = navGroups.flatMap((group) => group.entries);
  const { title: pageTitleText, subtitle: pageSubtitle } = pageTitle(pathname);

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

  const seenNotificationIds = useRef<Set<string> | null>(null);
  const pollNewNotifications = () => {
    notificationsApi.inApp
      .list(15)
      .then((rows) => {
        if (!seenNotificationIds.current) {
          seenNotificationIds.current = new Set(rows.map((r) => r.id));
          return;
        }
        const fresh = rows.filter((r) => !seenNotificationIds.current!.has(r.id));
        for (const r of fresh) {
          seenNotificationIds.current!.add(r.id);
          toast(r.title || 'Notification', { description: r.message });
        }
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    if (!user) return;
    refreshActivitiesRecentCount();
    const intervalActivities = setInterval(refreshActivitiesRecentCount, 60000);
    refreshInAppCount();
    pollNewNotifications();
    const interval = setInterval(() => { refreshInAppCount(); pollNewNotifications(); }, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(intervalActivities);
    };
  }, [user]);

  useEffect(() => {
    const handler = () => { refreshInAppCount(); pollNewNotifications(); };
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

  const isActive = (href: string, exact?: boolean) => {
    if (exact || href === '/dashboard') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const badgeFor = (entry: NavEntry) => {
    if (entry.badge === 'activites') return activitiesRecentCount;
    if (entry.badge === 'notifications') return inAppUnreadCount;
    if (entry.badge === 'caisse') return caisseBadge;
    return 0;
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
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
      {/* Menu latéral — mesures relevées sur la V1 (255 px, en-tête 56 px, entrées 40 px) */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-[width] duration-200 overflow-hidden',
          sidebarCollapsed ? 'lg:w-12' : 'lg:w-[255px]',
        )}
        style={{ background: 'var(--afc-sidebar)', borderRight: '1px solid var(--afc-border)' }}
      >
        <Link
          href="/dashboard"
          className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--afc-border)] px-4"
        >
          <img src="/images/logo-afc.png" alt="Amicale Football Club" className="h-9 w-9 shrink-0 object-contain" />
          {!sidebarCollapsed && (
            <span className="truncate font-serif text-base font-medium tracking-[-0.01em] text-[var(--afc-text)]">
              Amicale FC
            </span>
          )}
        </Link>
        <nav className="flex-1 overflow-y-auto p-2">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              {!sidebarCollapsed && (
                <p className="flex h-8 items-center px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.entries.map((entry) => (
                  <NavLink
                    key={entry.href}
                    href={entry.href}
                    label={entry.label}
                    icon={entry.icon}
                    isActive={isActive(entry.href, entry.exact)}
                    collapsed={sidebarCollapsed}
                    badge={badgeFor(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-[var(--afc-border)] p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--afc-border)] bg-[var(--afc-avatar-bg)] text-xs font-semibold text-[var(--afc-avatar-text)]">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--afc-text)]">{user?.firstName} {user?.lastName}</p>
                <p className="truncate text-[11px] text-[var(--afc-muted)]">{isBureauOrAdmin ? (user?.email || roleLabelFr(user?.role || '')) : 'Membre'}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <Link
                href="/dashboard/parametres"
                title="Changer mon mot de passe"
                aria-label="Changer mon mot de passe"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--afc-border)] text-[var(--afc-muted)] transition hover:bg-[var(--sidebar-accent)] hover:text-[var(--afc-text)]"
              >
                <KeyRound size={14} strokeWidth={1.7} />
              </Link>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
              aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--afc-border)] text-[var(--afc-muted)] transition hover:bg-[var(--sidebar-accent)] hover:text-[var(--primary)]"
            >
              {theme === 'dark' ? <Sun size={14} strokeWidth={1.7} /> : <Moon size={14} strokeWidth={1.7} />}
            </button>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--afc-border)] text-[var(--afc-muted)] transition hover:bg-[var(--afc-badge-red-bg)] hover:text-[var(--destructive)]"
            >
              <LogOut size={14} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </aside>

      {/* En-tête mobile */}
      <header
        className="lg:hidden sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--afc-border)] px-4"
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
        <h2 className="min-w-0 flex-1 truncate font-serif text-[20px] text-[var(--afc-text)]">{pageTitleText}</h2>
        <div className="flex items-center gap-1">
          {isBureauOrAdmin && (
            <Link
              href="/dashboard/cotisations/paiement"
              className="btn-primary !min-h-9 px-2.5"
              aria-label="Nouveau paiement"
              title="Nouveau paiement"
            >
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--afc-text-soft)] hover:bg-[rgba(var(--afc-hl),0.06)] transition"
            aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
          >
            {theme === 'dark' ? <Sun size={20} strokeWidth={1.7} /> : <Moon size={20} strokeWidth={1.7} />}
          </button>
          <Link
            href="/dashboard/notifications"
            className="relative p-2 rounded-lg text-[var(--afc-text-soft)] hover:bg-[rgba(var(--afc-hl),0.06)] transition"
            aria-label="Notifications"
          >
            <Bell size={21} strokeWidth={1.7} />
            {inAppUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--destructive)] px-1.5 text-[10px] font-bold text-white">
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
        className={cn(
          'lg:hidden fixed top-16 left-0 right-0 z-40 h-[calc(100vh-4rem)] overflow-y-auto transition-transform duration-200',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'var(--afc-sidebar)', borderRight: '1px solid var(--afc-border)' }}
      >
        <nav className="p-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="flex h-8 items-center px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.entries.map((entry) => (
                  <NavLink
                    key={entry.href}
                    href={entry.href}
                    label={entry.label}
                    icon={entry.icon}
                    isActive={isActive(entry.href, entry.exact)}
                    onClick={() => setMobileMenuOpen(false)}
                    badge={badgeFor(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--afc-border)]">
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(false); setLogoutOpen(true); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--afc-text-soft)] hover:bg-[var(--afc-badge-red-bg)] hover:text-[var(--destructive)]"
          >
            <LogOut size={19} strokeWidth={1.7} />
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

      {/* Contenu — barre du haut de 56 px (titre Fraunces 22 px + sous-titre), marges 24/32/48 */}
      <main
        className={cn(
          'flex-1 min-w-0 flex flex-col min-h-screen bg-[var(--afc-bg)] text-[var(--afc-text)] transition-[padding] duration-200',
          sidebarCollapsed ? 'lg:pl-12' : 'lg:pl-[255px]',
        )}
      >
        <div className="sticky top-0 z-20 hidden h-14 items-center gap-4 border-b border-[var(--afc-border)] bg-[var(--afc-bg)] px-8 lg:flex">
          <button
            type="button"
            onClick={toggleSidebar}
            title={(sidebarCollapsed ? 'Afficher la barre latérale' : 'Réduire la barre latérale') + ' (Ctrl/Cmd + B)'}
            aria-label={sidebarCollapsed ? 'Afficher la barre latérale' : 'Réduire la barre latérale'}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--afc-muted)] transition hover:bg-[var(--sidebar-accent)] hover:text-[var(--primary)]"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.7} /> : <PanelLeftClose size={16} strokeWidth={1.7} />}
          </button>
          <span className="h-6 w-px shrink-0 bg-[var(--afc-border)]" aria-hidden="true" />
          <h2 className="shrink-0 font-serif text-[22px] leading-none tracking-[-0.01em] text-[var(--afc-text)]">{pageTitleText}</h2>
          {pageSubtitle && <p className="truncate text-[12.5px] text-[var(--afc-muted)]">{pageSubtitle}</p>}
          {isBureauOrAdmin && (
            <Link href="/dashboard/cotisations/paiement" className="btn-primary ml-auto shrink-0">
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
              Nouveau paiement
            </Link>
          )}
        </div>
        {user && !user.isSuspended && user.reactivatedAt && user.role !== 'ADMIN' && (
          <div className="afc-badge-amber border-b px-4 py-3 text-center text-sm font-medium">
            Vous avez été réactivé temporairement. Vous avez <strong>24 h</strong> pour régulariser votre cotisation, sinon votre compte sera désactivé à nouveau.{' '}
            <Link href="/dashboard/regulariser" className="underline font-semibold">Payer maintenant</Link>
          </div>
        )}
        <div className="flex-1 w-full px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </div>
      </main>

      {/* Bottom navigation — mobile (4 principaux + Plus) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t border-[var(--afc-border)] bg-[var(--afc-sidebar)]/95 backdrop-blur py-2 safe-area-pb">
        {flatNav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 min-w-[72px] transition touch-manipulation',
                active ? 'bg-[var(--sidebar-accent)] font-medium text-[var(--primary)] shadow-sm' : 'text-[var(--afc-muted)] hover:text-[var(--afc-text)]',
              )}
            >
              <Icon size={21} strokeWidth={1.7} />
              <span className="text-[10px] font-medium truncate max-w-[80px]">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            'flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 min-w-[72px] transition touch-manipulation',
            flatNav.slice(4).some((item) => isActive(item.href, item.exact))
              ? 'bg-[var(--sidebar-accent)] font-medium text-[var(--primary)] shadow-sm'
              : 'text-[var(--afc-muted)] hover:text-[var(--afc-text)]',
          )}
          aria-label="Plus de menus"
        >
          <Menu size={21} strokeWidth={1.7} />
          <span className="text-[10px] font-medium">Plus</span>
        </button>
      </nav>
    </div>
  );
}

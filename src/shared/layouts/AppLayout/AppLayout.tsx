import { Link, Outlet, useNavigate, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { config } from '@/core/config/env.ts';
import { PageTransition } from '@/lib/animations/PageTransition.tsx';
import { cn } from '@/lib/utils.ts';
import { logout } from '@/shared/auth/service.ts';
import {
  CommandPaletteLazy,
  preloadCommandPalette,
} from '@/shared/components/CommandPalette/index.ts';
import { EmailVerificationBanner } from '@/shared/components/EmailVerificationBanner/index.ts';
import { NotificationCenter } from '@/shared/components/NotificationCenter/index.ts';
import { OrganizationSwitcher } from '@/shared/components/OrganizationSwitcher/index.ts';
import { SessionTimeoutDialog } from '@/shared/components/SessionTimeoutDialog/index.ts';
import { settingsHash } from '@/shared/components/SettingsModal/index.ts';
import { ThemeModeToggle } from '@/shared/components/ThemeModeToggle/index.ts';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu.tsx';
import { Separator } from '@/shared/components/ui/separator.tsx';
import { type AccessCheck, useVisibleNav } from '@/shared/hooks/useCan/index.ts';
import { useOrgBrand } from '@/shared/hooks/useOrgBrand/index.ts';
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
} from '@/shared/icons/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

/**
 * Org-scoped nav entries; rendered as Links to
 * `/organization/$organizationSlug/<segment>` with the current param.
 * `id` doubles as the stable `data-testid` slug (`nav-<id>`).
 */
const NAV_ITEMS: ({
  id: string;
  segment: 'dashboard';
  icon: typeof LayoutDashboard;
  label: string;
} & AccessCheck)[] = [
  { id: 'dashboard', segment: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
];

type NavItems = typeof NAV_ITEMS;

/**
 * Dual-URL dashboard nav link: a team org links to its
 * `/organization/$organizationSlug/dashboard`; a personal org (no org param)
 * links to the root `/dashboard`. Styling is passed in so each shell can render
 * the nav its own way.
 */
function DashboardNavLink({
  organizationSlug,
  testId,
  activeClassName,
  inactiveClassName,
  children,
}: {
  organizationSlug: string;
  testId: string;
  activeClassName: string;
  inactiveClassName: string;
  children: ReactNode;
}) {
  const shared = {
    activeOptions: { exact: true } as const,
    activeProps: { className: activeClassName },
    inactiveProps: { className: inactiveClassName },
    'data-testid': testId,
  };
  return organizationSlug ? (
    <Link
      to="/organization/$organizationSlug/dashboard"
      params={{ organizationSlug }}
      {...shared}
    >
      {children}
    </Link>
  ) : (
    <Link to="/dashboard" {...shared}>
      {children}
    </Link>
  );
}

// ── Shared pieces (used by every shell) ──────────────────────────────────────

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:underline"
    >
      Skip to main content
    </a>
  );
}

function BrandLogo() {
  return (
    <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
      <Boxes className="h-5 w-5" />
    </div>
  );
}

/** ⌘K search — wide button by default, icon-only when `iconOnly`. */
function SearchTrigger({ iconOnly = false }: { iconOnly?: boolean }) {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const open = () => useUIStore.getState().setCommandPaletteOpen(true);
  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={open}
        onMouseEnter={preloadCommandPalette}
        onFocus={preloadCommandPalette}
        aria-label="Search"
        data-testid="search-trigger"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      className="text-muted-foreground hidden h-8 w-48 justify-start gap-2 sm:flex lg:w-64"
      onClick={open}
      onMouseEnter={preloadCommandPalette}
      onFocus={preloadCommandPalette}
      data-testid="search-trigger"
    >
      <Search className="h-4 w-4" />
      <span className="text-sm">Search...</span>
      <kbd className="bg-muted text-foreground/70 ml-auto rounded border px-1.5 text-[10px] font-medium">
        {isMac ? '⌘K' : 'Ctrl+K'}
      </kbd>
    </Button>
  );
}

/** Avatar + dropdown (settings, logout). */
function UserMenu({ align = 'end' }: { align?: 'end' | 'start' }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() ?? '??');

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // forceLogout handles the redirect
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full"
          aria-label="User menu"
          data-testid="user-menu-trigger"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.name ?? 'User'}</p>
            <p className="text-muted-foreground text-xs">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            void navigate({ to: '.', hash: settingsHash('account', 'profile') })
          }
          data-testid="user-menu-settings"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
          data-testid="logout-button"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const NAV_STYLES = {
  sidebar: {
    active:
      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors bg-sidebar-accent text-sidebar-accent-foreground',
    inactive:
      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
  },
  top: {
    active:
      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium bg-muted text-foreground',
    inactive:
      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground',
  },
  rail: {
    active:
      'flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground',
    inactive:
      'flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
  },
} as const;

function NavList({
  navItems,
  organizationSlug,
  variant,
}: {
  navItems: NavItems;
  organizationSlug: string;
  variant: keyof typeof NAV_STYLES;
}) {
  // eslint-disable-next-line security/detect-object-injection -- variant is a typed keyof union
  const style = NAV_STYLES[variant];
  return navItems.map((item) => (
    <DashboardNavLink
      key={item.id}
      organizationSlug={organizationSlug}
      testId={`nav-${item.id}`}
      activeClassName={style.active}
      inactiveClassName={style.inactive}
    >
      <item.icon className={variant === 'rail' ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden />
      {variant === 'rail' ? <span className="sr-only">{item.label}</span> : item.label}
    </DashboardNavLink>
  ));
}

/** Bottom tab bar for mobile (shells that hide their nav on small screens). */
function MobileNav({
  navItems,
  organizationSlug,
}: {
  navItems: NavItems;
  organizationSlug: string;
}) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="bg-background fixed right-0 bottom-0 left-0 z-40 flex border-t md:hidden"
      data-testid="mobile-bottom-bar"
    >
      {navItems.map((item) => (
        <DashboardNavLink
          key={item.id}
          organizationSlug={organizationSlug}
          testId={`nav-${item.id}`}
          activeClassName="flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-foreground bg-muted/50"
          inactiveClassName="flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <item.icon className="h-5 w-5" aria-hidden />
          <span>{item.label}</span>
        </DashboardNavLink>
      ))}
    </nav>
  );
}

/** The scrolling content region (email banner + routed page). */
function AppMain() {
  return (
    <>
      <EmailVerificationBanner />
      <main
        id="main-content"
        className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 md:pb-6"
        data-testid="main-content"
      >
        <div
          className={cn(
            'w-full',
            config.layoutWidth === 'contained' && 'mx-auto max-w-screen-2xl',
          )}
        >
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </>
  );
}

// ── Variant 0 — Sidebar (default) ────────────────────────────────────────────

function SidebarShell({
  navItems,
  organizationSlug,
}: {
  navItems: NavItems;
  organizationSlug: string;
}) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <>
      {sidebarOpen && (
        <div
          className="bg-overlay/50 fixed inset-0 z-40 md:hidden"
          aria-hidden="true"
          onClick={toggleSidebar}
        />
      )}

      <aside
        aria-label="Sidebar navigation"
        data-testid="sidebar"
        className={cn(
          'bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-200 md:relative',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-3">
          <BrandLogo />
          <OrganizationSwitcher className="flex-1" align="start" />
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
          <NavList
            navItems={navItems}
            organizationSlug={organizationSlug}
            variant="sidebar"
          />
        </nav>
        <Separator className="bg-sidebar-border" />
        <div className="p-3">
          <p className="text-sidebar-foreground/70 px-3 text-xs">
            &copy; {new Date().getFullYear()} Core Platform
          </p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="bg-background flex h-14 items-center gap-2 border-b px-4 sm:gap-4 sm:px-6"
          data-testid="header"
        >
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            data-testid="sidebar-toggle"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SearchTrigger />
          <div className="flex-1" />
          <NotificationCenter />
          <ThemeModeToggle />
          <UserMenu />
        </header>
        <AppMain />
      </div>

      <MobileNav navItems={navItems} organizationSlug={organizationSlug} />
    </>
  );
}

// ── Variant 1 — Top nav (TEMP preview) ───────────────────────────────────────

function TopNavShell({
  navItems,
  organizationSlug,
}: {
  navItems: NavItems;
  organizationSlug: string;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header
        className="bg-background flex h-14 items-center gap-3 border-b px-4 sm:px-6"
        data-testid="header"
      >
        <BrandLogo />
        <OrganizationSwitcher className="hidden w-44 sm:block" align="start" />
        <Separator orientation="vertical" className="mx-1 hidden h-6 md:block" />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          <NavList
            navItems={navItems}
            organizationSlug={organizationSlug}
            variant="top"
          />
        </nav>
        <div className="flex-1" />
        <SearchTrigger />
        <NotificationCenter />
        <ThemeModeToggle />
        <UserMenu />
      </header>
      <AppMain />
      <MobileNav navItems={navItems} organizationSlug={organizationSlug} />
    </div>
  );
}

// ── Variant 2 — Icon rail with profile at the foot (TEMP preview) ────────────

function RailShell({
  navItems,
  organizationSlug,
}: {
  navItems: NavItems;
  organizationSlug: string;
}) {
  return (
    <>
      <aside
        aria-label="Sidebar navigation"
        data-testid="sidebar"
        className="bg-sidebar text-sidebar-foreground flex w-14 shrink-0 flex-col items-center gap-1 border-r py-3 sm:w-16"
      >
        <BrandLogo />
        <nav
          className="mt-2 flex flex-1 flex-col items-center gap-1"
          aria-label="Main navigation"
        >
          <NavList
            navItems={navItems}
            organizationSlug={organizationSlug}
            variant="rail"
          />
        </nav>
        {/* Controls live at the foot of the rail — profile-as-rail-button. */}
        <NotificationCenter />
        <ThemeModeToggle />
        <UserMenu align="start" />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="bg-background flex h-14 items-center gap-3 border-b px-4 sm:px-6"
          data-testid="header"
        >
          <OrganizationSwitcher className="w-44 max-w-[60%]" align="start" />
          <div className="flex-1" />
          <SearchTrigger />
        </header>
        <AppMain />
      </div>
    </>
  );
}

/**
 * Main authenticated layout. Variant 0 (default) is the sidebar + header shell;
 * variants 1 (top nav) and 2 (icon rail) are TEMP design previews selected by
 * `appVariant`, which Shuffle cycles. Remove the variants + the `appVariant`
 * store field once a shell is chosen. Exports `Component` for lazy() resolution.
 */
export function Component() {
  useOrgBrand();
  const navItems = useVisibleNav(NAV_ITEMS);
  const { organizationSlug = '' } = useParams({ strict: false });
  const variant = useThemeStore((s) => s.appVariant);

  return (
    <div className="bg-background flex h-screen overflow-hidden" data-testid="app-layout">
      <SkipLink />
      <Shell variant={variant} navItems={navItems} organizationSlug={organizationSlug} />
      <CommandPaletteLazy />
      <SessionTimeoutDialog />
    </div>
  );
}

/** TEMP: select the active shell (keeps Component free of a nested ternary). */
function Shell({
  variant,
  navItems,
  organizationSlug,
}: {
  variant: number;
  navItems: NavItems;
  organizationSlug: string;
}) {
  const props = { navItems, organizationSlug };
  if (variant === 1) return <TopNavShell {...props} />;
  if (variant === 2) return <RailShell {...props} />;
  return <SidebarShell {...props} />;
}

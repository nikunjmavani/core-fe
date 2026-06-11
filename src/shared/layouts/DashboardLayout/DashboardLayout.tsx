import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react';

import { PageTransition } from '@/lib/animations/PageTransition.tsx';
import { cn } from '@/lib/utils.ts';
import { logout } from '@/shared/auth/service.ts';
import { CommandPaletteLazy } from '@/shared/components/CommandPaletteLazy.tsx';
import { OrgSwitcher } from '@/shared/components/OrgSwitcher.tsx';
import { preloadCommandPalette } from '@/shared/components/preload-command-palette.ts';
import { SessionTimeoutDialog } from '@/shared/components/SessionTimeoutDialog.tsx';
import { SettingsDialog } from '@/shared/components/SettingsDialog/index.ts';
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
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

/** Stable `data-testid` for sidebar and mobile nav links. */
function navTestId(to: string): string {
  const slug = to === '/' ? 'dashboard' : to.replace(/^\//, '').replace(/\//g, '-');
  return `nav-${slug}`;
}

const NAV_ITEMS: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
}[] = [{ to: '/', icon: LayoutDashboard, label: 'Dashboard' }];

/** Nav entries the current user is allowed to see. */
function useVisibleNavItems() {
  return NAV_ITEMS;
}

/**
 * Main authenticated layout with collapsible sidebar + header.
 * Exports `Component` for React Router's lazy() resolution.
 */
export function Component() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navItems = useVisibleNavItems();

  return (
    <div
      className="bg-background flex h-screen overflow-hidden"
      data-testid="dashboard-layout"
    >
      <a
        href="#main-content"
        className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:underline"
      >
        Skip to main content
      </a>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <Sidebar navItems={navItems} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 md:pb-6"
          data-testid="main-content"
        >
          <div className="mx-auto w-full max-w-screen-2xl">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — same items as sidebar, 44px+ touch targets */}
      <nav
        aria-label="Mobile navigation"
        className="bg-background fixed right-0 bottom-0 left-0 z-40 flex border-t md:hidden"
        data-testid="mobile-bottom-bar"
      >
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            activeProps={{
              className: cn(
                'flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-foreground bg-muted/50',
              ),
            }}
            inactiveProps={{
              className: cn(
                'flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              ),
            }}
            data-testid={navTestId(item.to)}
          >
            <item.icon className="h-5 w-5" aria-hidden />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Command Palette (⌘K) — lazy loaded on first open */}
      <CommandPaletteLazy />
      <SessionTimeoutDialog />
      <SettingsDialog />
    </div>
  );
}

// ── Sidebar ──
function Sidebar({ navItems }: { navItems: typeof NAV_ITEMS }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <aside
      aria-label="Sidebar navigation"
      data-testid="sidebar"
      className={cn(
        'bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-200 md:relative',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Product icon (left) + organization switcher (right) */}
      <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-3">
        <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Boxes className="h-5 w-5" />
        </div>
        <OrgSwitcher className="flex-1" align="start" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            activeProps={{
              className: cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'bg-sidebar-accent text-sidebar-accent-foreground',
              ),
            }}
            inactiveProps={{
              className: cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              ),
            }}
            data-testid={navTestId(item.to)}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Footer */}
      <div className="p-3">
        <p className="text-sidebar-foreground/50 px-3 text-xs">
          &copy; {new Date().getFullYear()} Core Platform
        </p>
      </div>
    </aside>
  );
}

// ── Header ──
function Header() {
  const user = useAuthStore((s) => s.user);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { theme, setTheme } = useThemeStore();
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

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const shortcutHint = isMac ? '\u2318K' : 'Ctrl+K';

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // forceLogout handles the redirect
    }
  };

  let ThemeIcon = Monitor;
  if (theme === 'dark') ThemeIcon = Moon;
  else if (theme === 'light') ThemeIcon = Sun;

  return (
    <header
      role="banner"
      aria-label="Main header"
      className="bg-background flex h-14 items-center gap-4 border-b px-4"
      data-testid="header"
    >
      {/* Mobile menu toggle */}
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

      {/* Search trigger — preload on hover for faster first open */}
      <Button
        variant="outline"
        className="text-muted-foreground hidden h-8 w-64 justify-start gap-2 sm:flex"
        onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
        onMouseEnter={preloadCommandPalette}
        onFocus={preloadCommandPalette}
        data-testid="search-trigger"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search...</span>
        <kbd className="bg-muted text-muted-foreground ml-auto rounded border px-1.5 text-[10px] font-medium">
          {shortcutHint}
        </kbd>
      </Button>

      <div className="flex-1" />

      {/* Theme toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Toggle theme">
            <ThemeIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" /> Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" /> Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" /> System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User menu */}
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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.name ?? 'User'}</p>
              <p className="text-muted-foreground text-xs">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void navigate({ to: '/settings/profile' })}
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
    </header>
  );
}

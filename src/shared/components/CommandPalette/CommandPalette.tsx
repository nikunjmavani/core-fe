import { useNavigate } from '@tanstack/react-router';
import { Command } from 'cmdk';
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils.ts';
import { logout } from '@/shared/auth/service.ts';
import { settingsHash } from '@/shared/components/SettingsModal/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

/**
 * Global command palette powered by cmdk.
 * Activated via Cmd+K (Mac) or Ctrl+K (Windows/Linux).
 * Includes focus trap, proper ARIA dialog semantics, and platform-aware hints.
 */
export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const navigate = useNavigate();
  const setTheme = useThemeStore((s) => s.setTheme);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Note: Keyboard shortcut (Cmd+K) is handled by CommandPaletteLazy for lazy-load optimization

  // Focus trap: save previous focus and restore on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Trap Tab focus within dialog
  useEffect(() => {
    if (!open) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    [setOpen],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      ref={dialogRef}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed top-[20%] left-1/2 w-full max-w-lg -translate-x-1/2">
        <Command
          className="bg-popover rounded-xl border shadow-2xl"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          <div className="flex items-center border-b px-3">
            <Search className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
            {/* eslint-disable jsx-a11y/no-autofocus -- Intentional: command palette must focus the input immediately on open for keyboard-driven UX */}
            <Command.Input
              placeholder="Type a command or search..."
              className="placeholder:text-muted-foreground flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
            {/* eslint-enable jsx-a11y/no-autofocus */}
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="text-muted-foreground py-6 text-center text-sm">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="text-muted-foreground px-1 py-1.5 text-xs font-medium"
            >
              <CommandItem
                onSelect={() => runCommand(() => navigate({ to: '/' }))}
                icon={LayoutDashboard}
              >
                Dashboard
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() =>
                    navigate({ to: '.', hash: settingsHash('account', 'profile') }),
                  )
                }
                icon={Settings}
              >
                User settings
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() =>
                    navigate({ to: '.', hash: settingsHash('organization', 'general') }),
                  )
                }
                icon={Building2}
              >
                Organization settings
              </CommandItem>
            </Command.Group>

            <Command.Separator className="bg-border my-1 h-px" />

            <Command.Group
              heading="Theme"
              className="text-muted-foreground px-1 py-1.5 text-xs font-medium"
            >
              <CommandItem
                onSelect={() => runCommand(() => setTheme('light'))}
                icon={Sun}
              >
                Light Mode
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => setTheme('dark'))}
                icon={Moon}
              >
                Dark Mode
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => setTheme('system'))}
                icon={Monitor}
              >
                System Theme
              </CommandItem>
            </Command.Group>

            <Command.Separator className="bg-border my-1 h-px" />

            <Command.Group
              heading="Account"
              className="text-muted-foreground px-1 py-1.5 text-xs font-medium"
            >
              <CommandItem
                onSelect={() =>
                  runCommand(() =>
                    navigate({ to: '.', hash: settingsHash('account', 'profile') }),
                  )
                }
                icon={Settings}
              >
                Settings
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => {
                    logout().catch(() => {});
                  })
                }
                icon={LogOut}
                destructive
              >
                Log out
              </CommandItem>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  children,
  icon: Icon,
  onSelect,
  destructive = false,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        'aria-selected:bg-accent aria-selected:text-accent-foreground',
        destructive && 'text-destructive aria-selected:text-destructive',
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Command.Item>
  );
}

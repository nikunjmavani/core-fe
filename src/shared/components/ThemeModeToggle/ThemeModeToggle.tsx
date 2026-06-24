import { config } from '@/core/config/env.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu.tsx';
import { Monitor, Moon, Sparkles, Sun } from '@/shared/icons/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

/**
 * Light / Dark / System mode toggle (shadcn-style ModeToggle). The trigger icon
 * reflects the active mode. Shared so it appears in the app header AND the
 * auth/public layouts — the theme is switchable everywhere, including before
 * sign-in. Accent presets live in Settings → Account → Appearance.
 *
 * TEMP (testing): the menu also exposes a quick "Shuffle theme" item so the
 * random-accent generator can be exercised without opening Settings. It mirrors
 * the Appearance panel's shuffle and is hidden when the theme is locked. Remove
 * the shuffle item once testing is done — the canonical home is the panel.
 */
export function ThemeModeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const shuffleTheme = useThemeStore((s) => s.shuffleTheme);

  let ThemeIcon = Monitor;
  if (theme === 'dark') ThemeIcon = Moon;
  else if (theme === 'light') ThemeIcon = Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          data-testid="theme-toggle"
        >
          <ThemeIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')} data-testid="theme-light">
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} data-testid="theme-dark">
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} data-testid="theme-system">
          <Monitor className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
        {/* TEMP testing shortcut — canonical shuffle lives in Settings → Appearance. */}
        {config.themeLock ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={shuffleTheme} data-testid="theme-shuffle-menu">
              <Sparkles className="mr-2 h-4 w-4" /> Shuffle theme
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

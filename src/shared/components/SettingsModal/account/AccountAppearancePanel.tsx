import { config } from '@/core/config/env.ts';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Check, Monitor, Moon, Sparkles, Sun } from '@/shared/icons/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';
import { THEME_PRESETS } from '@/shared/theme/index.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

const THEMES = [
  {
    id: 'light' as const,
    label: 'Light',
    description: 'Bright theme for daytime work.',
    icon: Sun,
  },
  {
    id: 'dark' as const,
    label: 'Dark',
    description: 'Dimmed theme — easier on the eyes at night.',
    icon: Moon,
  },
  {
    id: 'system' as const,
    label: 'System',
    description: 'Follow your OS preference.',
    icon: Monitor,
  },
];

/**
 * Appearance section — light/dark/system mode + named accent presets + a
 * shuffle. Persists via {@link useThemeStore} (`.dark` class + `data-theme`).
 * When `config.themeLock` is set the theme is pinned in code and the controls
 * are hidden (FE-67).
 */
export function AccountAppearancePanel() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const preset = useThemeStore((s) => s.preset);
  const setPreset = useThemeStore((s) => s.setPreset);
  const shuffleTheme = useThemeStore((s) => s.shuffleTheme);

  if (config.themeLock) {
    return (
      <div className="space-y-6" data-testid="settings-section-appearance">
        <SectionHeader title="Appearance" description="How the app looks for you." />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Theme</CardTitle>
            <CardDescription data-testid="theme-locked">
              The theme is managed by your organization&apos;s configuration and
              can&apos;t be changed here.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-section-appearance">
      <SectionHeader title="Appearance" description="Choose how the app looks for you." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
          <CardDescription>
            Switch instantly — your choice is saved on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(t.id)}
                  data-testid={`theme-${t.id}`}
                  className={cn(
                    'group bg-background relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all',
                    'focus-visible:ring-ring outline-none focus-visible:ring-2',
                    active
                      ? 'border-primary ring-primary/20 ring-2'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <t.icon className="text-muted-foreground size-5" aria-hidden />
                    {active && <Check className="text-primary size-4" aria-hidden />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-muted-foreground text-xs">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accent</CardTitle>
          <CardDescription>
            Pick an accent colour, or shuffle for a surprise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="grid gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Accent preset"
          >
            {THEME_PRESETS.map((p) => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPreset(p.id)}
                  data-testid={`preset-${p.id}`}
                  className={cn(
                    'bg-background relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
                    'focus-visible:ring-ring outline-none focus-visible:ring-2',
                    active
                      ? 'border-primary ring-primary/20 ring-2'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <span
                    data-theme={p.id === 'default' ? undefined : p.id}
                    className="bg-primary size-5 shrink-0 rounded-full"
                    aria-hidden
                  />
                  <span className="text-sm font-medium">{p.label}</span>
                  {active && (
                    <Check className="text-primary ml-auto size-4" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={shuffleTheme}
            data-testid="theme-shuffle"
          >
            <Sparkles className="mr-2 size-4" aria-hidden />
            Shuffle theme
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { cn } from '@/lib/utils.ts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Check, Monitor, Moon, Sun } from '@/shared/icons/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

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
 * Appearance section — theme picker (light · dark · system).
 * Persists via {@link useThemeStore}; applies the `.dark` class on `<html>`.
 */
export function AccountAppearancePanel() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

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
    </div>
  );
}

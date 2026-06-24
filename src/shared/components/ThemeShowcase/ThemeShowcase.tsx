import { config } from '@/core/config/env.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Palette, Sparkles } from '@/shared/icons/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';
import {
  GENERATED_FONTS,
  GENERATED_PRESET,
  GENERATED_RADII,
  THEME_PRESETS,
} from '@/shared/theme/index.ts';

/** Chart-palette swatches — re-tint with the generated theme (mode-shared tokens). */
const CHART_SWATCHES = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
] as const;

/**
 * Dashboard "workspace theme" bar — a compact, accent-driven strip that mirrors
 * every shuffled axis at a glance: the accent gradient + glow, the chart-palette
 * swatches, and the active font/radius label. So a theme change (Shuffle or a
 * preset) is immediately visible from the landing surface. Shuffle is inline;
 * named presets + the full picker live in Settings → Appearance. Controls hide
 * when the theme is locked.
 */
export function ThemeShowcase() {
  const preset = useThemeStore((s) => s.preset);
  const customTheme = useThemeStore((s) => s.customTheme);
  const shuffleTheme = useThemeStore((s) => s.shuffleTheme);

  const label =
    preset === GENERATED_PRESET
      ? [
          'Custom',
          customTheme && GENERATED_FONTS[customTheme.bodyFontId]?.label,
          customTheme && GENERATED_RADII[customTheme.radiusId]?.label,
        ]
          .filter(Boolean)
          .join(' · ')
      : (THEME_PRESETS.find((p) => p.id === preset)?.label ?? 'Default');

  return (
    <section
      aria-label="Workspace theme"
      data-testid="dashboard-theme-showcase"
      className="from-primary/15 via-card to-card border-primary/20 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 sm:p-5"
    >
      <div
        className="bg-primary/20 pointer-events-none absolute -top-12 -right-10 h-36 w-36 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="bg-primary text-primary-foreground shadow-primary/30 flex size-10 shrink-0 items-center justify-center rounded-lg shadow-lg">
          <Palette className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Workspace theme
          </p>
          <p className="truncate font-medium" data-testid="dashboard-theme-label">
            {label}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5"
          aria-hidden="true"
          data-testid="dashboard-theme-palette"
        >
          {CHART_SWATCHES.map((swatch) => (
            <span
              key={swatch}
              className={`ring-border size-4 rounded-full ring-1 ${swatch}`}
            />
          ))}
        </div>
        {config.themeLock ? null : (
          <Button
            type="button"
            size="sm"
            onClick={shuffleTheme}
            data-testid="dashboard-theme-shuffle"
          >
            <Sparkles className="mr-2 size-4" aria-hidden="true" /> Shuffle
          </Button>
        )}
        <a
          href="#settings/account/appearance"
          className="text-primary text-sm font-medium hover:underline"
          data-testid="dashboard-theme-customize"
        >
          Customize →
        </a>
      </div>
    </section>
  );
}

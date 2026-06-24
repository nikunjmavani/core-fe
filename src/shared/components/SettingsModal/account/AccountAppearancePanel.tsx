import { config } from '@/core/config/env.ts';
import { cn } from '@/lib/utils.ts';
import { SectionHeader } from '@/shared/components/SettingsModal/SettingsPanelShell.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select.tsx';
import { Check, Monitor, Moon, Sparkles, Sun } from '@/shared/icons/index.ts';
import { notify } from '@/shared/notify/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';
import {
  ACCENT_COLORS,
  BASE_COLORS,
  GENERATED_FONTS,
  GENERATED_PRESET,
  GENERATED_RADII,
  type GeneratedTheme,
  ICON_LIBRARIES,
  ICON_WEIGHTS,
  MENU_STYLES,
  TOAST_POSITIONS,
  TOAST_VARIANTS,
  type ToastPosition,
  type ToastVariant,
} from '@/shared/theme/index.ts';

const THEMES = [
  { id: 'light' as const, label: 'Light', description: 'Bright theme.', icon: Sun },
  { id: 'dark' as const, label: 'Dark', description: 'Dimmed for night.', icon: Moon },
  {
    id: 'system' as const,
    label: 'System',
    description: 'Follow your OS.',
    icon: Monitor,
  },
];

const RADIUS_OPTIONS = Object.entries(GENERATED_RADII).map(([id, r]) => ({
  id,
  label: r.label,
}));

/** TEMP: toast-design choices for the preview picker. */
const TOAST_VARIANT_OPTIONS = TOAST_VARIANTS.map((id) => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
}));

/** TEMP: toast-position choices for the preview picker. */
const POSITION_LABELS: Record<ToastPosition, string> = {
  'top-right': 'Top right',
  'top-center': 'Top center',
  'bottom-right': 'Bottom right',
  'bottom-center': 'Bottom center',
};
const TOAST_POSITION_OPTIONS = TOAST_POSITIONS.map((id) => ({
  id,
  label: POSITION_LABELS[id],
}));

/** Accent / chart colour swatches (fixed catalog; colours come from .theme-dot-* CSS). */
function Swatches({
  ariaLabel,
  selectedId,
  onPick,
  testPrefix,
}: {
  ariaLabel: string;
  selectedId: string | null;
  onPick: (hue: number) => void;
  testPrefix: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {ACCENT_COLORS.map((c) => {
        const active = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={c.label}
            title={c.label}
            onClick={() => onPick(c.hue)}
            data-testid={`${testPrefix}-${c.id}`}
            className={cn(
              'focus-visible:ring-ring size-7 rounded-full transition outline-none focus-visible:ring-2',
              `theme-dot-${c.id}`,
              active
                ? 'ring-foreground ring-offset-background ring-2 ring-offset-2'
                : 'hover:scale-110',
            )}
          />
        );
      })}
    </div>
  );
}

/** Generic pill radiogroup for base colour / radius / menu style. */
function Choices({
  ariaLabel,
  value,
  options,
  onPick,
  testPrefix,
}: {
  ariaLabel: string;
  value: string;
  options: readonly { id: string; label: string }[];
  onPick: (id: string) => void;
  testPrefix: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(o.id)}
            data-testid={`${testPrefix}-${o.id}`}
            className={cn(
              'focus-visible:ring-ring rounded-md border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2',
              active
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Font dropdown (body / heading) over the web-safe catalog. */
function FontSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-medium">
        {label}
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className="w-full"
          aria-labelledby={`${id}-label`}
          data-testid={id}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(GENERATED_FONTS).map(([fid, f]) => (
            <SelectItem key={fid} value={fid}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <p className="text-sm font-medium">{children}</p>;
}

function accentIdForHue(hue: number): string | null {
  return ACCENT_COLORS.find((c) => c.hue === hue)?.id ?? null;
}

function customLookLabel(bodyFontId: string, radiusId: string): string {
  return [
    // eslint-disable-next-line security/detect-object-injection -- key from the fixed font catalog
    GENERATED_FONTS[bodyFontId]?.label,
    // eslint-disable-next-line security/detect-object-injection -- key from the fixed radius catalog
    GENERATED_RADII[radiusId]?.label,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Derive the selected picker ids + a summary label from the current look. */
function lookFields(look: GeneratedTheme | null) {
  const bodyFontId = look?.bodyFontId ?? 'inter';
  const radiusId = look?.radiusId ?? 'default';
  return {
    accentId: look ? accentIdForHue(look.hue) : null,
    chartId: look ? accentIdForHue(look.chartHue) : null,
    bodyFontId,
    headingFontId: look?.headingFontId ?? 'inter',
    radiusId,
    customLook: look ? customLookLabel(bodyFontId, radiusId) : '',
  };
}

/**
 * Appearance section — a shadcn-create-style theme studio: light/dark/system
 * mode plus per-axis pickers (accent colour, chart colour, base colour, body +
 * heading font, radius, menu style) and a Shuffle. Persists via
 * {@link useThemeStore}. When `config.themeLock` is set the theme is pinned in
 * code and the controls are hidden (FE-67).
 */
export function AccountAppearancePanel() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const preset = useThemeStore((s) => s.preset);
  const customTheme = useThemeStore((s) => s.customTheme);
  const baseId = useThemeStore((s) => s.baseId);
  const menu = useThemeStore((s) => s.menu);
  const iconWeight = useThemeStore((s) => s.iconWeight);
  const iconLibrary = useThemeStore((s) => s.iconLibrary);
  const updateLook = useThemeStore((s) => s.updateLook);
  const setBaseColor = useThemeStore((s) => s.setBaseColor);
  const setMenu = useThemeStore((s) => s.setMenu);
  const setIconWeight = useThemeStore((s) => s.setIconWeight);
  const setIconLibrary = useThemeStore((s) => s.setIconLibrary);
  const shuffleTheme = useThemeStore((s) => s.shuffleTheme);
  const toastVariant = useThemeStore((s) => s.toastVariant);
  const setToastVariant = useThemeStore((s) => s.setToastVariant);
  const toastPosition = useThemeStore((s) => s.toastPosition);
  const setToastPosition = useThemeStore((s) => s.setToastPosition);

  // Shuffle rolls the toast design too — fire a toast so the new look is visible.
  const handleShuffle = () => {
    shuffleTheme();
    notify.info('Theme shuffled', {
      description: 'New accent, fonts, radius — and toast style.',
    });
  };

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

  const { accentId, chartId, bodyFontId, headingFontId, radiusId, customLook } =
    lookFields(customTheme);

  return (
    <div className="space-y-6" data-testid="settings-section-appearance">
      <SectionHeader title="Appearance" description="Make the workspace yours." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mode</CardTitle>
          <CardDescription>Saved on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Mode">
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
          <CardTitle className="text-base">Colour</CardTitle>
          <CardDescription>Accent, charts, and the neutral base.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <FieldLabel>Accent colour</FieldLabel>
            <Swatches
              ariaLabel="Accent colour"
              selectedId={accentId}
              onPick={(hue) => updateLook({ hue })}
              testPrefix="accent"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Chart colour</FieldLabel>
            <Swatches
              ariaLabel="Chart colour"
              selectedId={chartId}
              onPick={(hue) => updateLook({ chartHue: hue })}
              testPrefix="chart"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Base colour</FieldLabel>
            <Choices
              ariaLabel="Base colour"
              value={baseId}
              options={BASE_COLORS}
              onPick={setBaseColor}
              testPrefix="base"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Type &amp; shape</CardTitle>
          <CardDescription>Fonts, corner radius, and menu surface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FontSelect
              id="font-body"
              label="Body font"
              value={bodyFontId}
              onChange={(value) => updateLook({ bodyFontId: value })}
            />
            <FontSelect
              id="font-heading"
              label="Heading font"
              value={headingFontId}
              onChange={(value) => updateLook({ headingFontId: value })}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Radius</FieldLabel>
            <Choices
              ariaLabel="Radius"
              value={radiusId}
              options={RADIUS_OPTIONS}
              onPick={(value) => updateLook({ radiusId: value })}
              testPrefix="radius"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Menu</FieldLabel>
            <Choices
              ariaLabel="Menu style"
              value={menu}
              options={MENU_STYLES}
              onPick={setMenu}
              testPrefix="menu"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Icon weight</FieldLabel>
            <Choices
              ariaLabel="Icon weight"
              value={iconWeight}
              options={ICON_WEIGHTS}
              onPick={setIconWeight}
              testPrefix="icon"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Icon library</FieldLabel>
            <Choices
              ariaLabel="Icon library"
              value={iconLibrary}
              options={ICON_LIBRARIES}
              onPick={setIconLibrary}
              testPrefix="iconlib"
            />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="toast-preview-card">
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>
            Temporary — pick a toast design, then fire a sample to preview it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>Toast design</FieldLabel>
            <Choices
              ariaLabel="Toast design"
              value={TOAST_VARIANTS[toastVariant] ?? TOAST_VARIANTS[0]}
              options={TOAST_VARIANT_OPTIONS}
              onPick={(id) => setToastVariant(TOAST_VARIANTS.indexOf(id as ToastVariant))}
              testPrefix="toast"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Position</FieldLabel>
            <Choices
              ariaLabel="Toast position"
              value={toastPosition as ToastPosition}
              options={TOAST_POSITION_OPTIONS}
              onPick={setToastPosition}
              testPrefix="toastpos"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                notify.success('Changes saved', {
                  description: 'Your settings are live.',
                })
              }
              data-testid="toast-preview-success"
            >
              Success
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                notify.error('Something went wrong', { description: 'Please try again.' })
              }
              data-testid="toast-preview-error"
            >
              Error
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                notify.warning('Heads up', { description: 'This action needs a review.' })
              }
              data-testid="toast-preview-warning"
            >
              Warning
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                notify.info('Did you know?', {
                  description: 'Shuffle also rolls this design.',
                })
              }
              data-testid="toast-preview-info"
            >
              Info
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleShuffle} data-testid="theme-shuffle">
          <Sparkles className="mr-2 size-4" aria-hidden />
          Shuffle
        </Button>
        {preset === GENERATED_PRESET ? (
          <span
            className="text-muted-foreground inline-flex items-center gap-1.5 text-sm"
            data-testid="preset-custom"
          >
            <Check className="text-primary size-4" aria-hidden />
            {customLook ? `Custom — ${customLook}` : 'Custom'}
          </span>
        ) : null}
      </div>
    </div>
  );
}

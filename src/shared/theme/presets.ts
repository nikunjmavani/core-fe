export interface ThemePreset {
  id: string;
  label: string;
}

/**
 * Built-in accent presets. `default` uses the base `@theme` palette (no
 * `data-theme`); the others apply accent overrides via the `[data-theme='<id>']`
 * blocks in `src/index.css`, composed with `.dark`.
 */
export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: 'default', label: 'Default' },
  { id: 'violet', label: 'Violet' },
  { id: 'emerald', label: 'Emerald' },
] as const;

export const DEFAULT_PRESET = 'default';

/** Synthetic preset id for a shuffled/generated look (not in THEME_PRESETS). */
export const GENERATED_PRESET = 'custom';

export function isThemePreset(id: string): boolean {
  return THEME_PRESETS.some((preset) => preset.id === id);
}

// ── Catalogs (Appearance pickers) ────────────────────────────────────────────

/** Named accent colours → hue, for the Theme-colour and Chart-colour pickers. */
export const ACCENT_COLORS = [
  { id: 'rose', label: 'Rose', hue: 12 },
  { id: 'orange', label: 'Orange', hue: 50 },
  { id: 'amber', label: 'Amber', hue: 75 },
  { id: 'lime', label: 'Lime', hue: 130 },
  { id: 'emerald', label: 'Emerald', hue: 160 },
  { id: 'teal', label: 'Teal', hue: 190 },
  { id: 'blue', label: 'Blue', hue: 255 },
  { id: 'violet', label: 'Violet', hue: 290 },
  { id: 'pink', label: 'Pink', hue: 350 },
] as const;

const DEFAULT_FONT_STACK = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

/**
 * Web-safe `--font-sans` / `--font-heading` stacks. The CSP is `font-src 'self'`,
 * so remote fonts can't load — these are families already on common OSes.
 */
export const GENERATED_FONTS: Record<string, { label: string; stack: string }> = {
  inter: { label: 'Inter / system', stack: DEFAULT_FONT_STACK },
  grotesk: {
    label: 'Grotesk',
    stack: "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif",
  },
  geometric: { label: 'Geometric', stack: 'Verdana, Geneva, system-ui, sans-serif' },
  humanist: {
    label: 'Humanist',
    stack: "'Gill Sans', 'Gill Sans MT', Calibri, system-ui, sans-serif",
  },
  serif: { label: 'Serif', stack: "Georgia, Cambria, 'Times New Roman', serif" },
  slab: {
    label: 'Old-style serif',
    stack: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif",
  },
  mono: {
    label: 'Monospace',
    stack: "ui-monospace, 'Courier New', SFMono-Regular, monospace",
  },
};

/** Base (lg) corner radius in rem; sm/md/xl derive from it. */
export const GENERATED_RADII: Record<string, { label: string; base: number }> = {
  sharp: { label: 'None', base: 0 },
  default: { label: 'Default', base: 0.5 },
  rounded: { label: 'Rounded', base: 0.75 },
  round: { label: 'Round', base: 1 },
};

/** Neutral tints — applied via `data-base` CSS blocks (mode-correct). */
export const BASE_COLORS = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'stone', label: 'Stone' },
  { id: 'slate', label: 'Slate' },
  { id: 'olive', label: 'Olive' },
] as const;
export const DEFAULT_BASE = 'neutral';

/** Menu surface styles — applied via `data-menu`. */
export const MENU_STYLES = [
  { id: 'default', label: 'Default' },
  { id: 'translucent', label: 'Translucent' },
] as const;
export const DEFAULT_MENU = 'default';

/** Icon weight — drives Lucide/Tabler `stroke-width` via the `--icon-stroke` var. */
export const ICON_WEIGHTS = [
  { id: 'thin', label: 'Thin', width: 1.5 },
  { id: 'regular', label: 'Regular', width: 2 },
  { id: 'bold', label: 'Bold', width: 2.5 },
] as const;
export const DEFAULT_ICON_WEIGHT = 'regular';

/** Icon library — Lucide is the default (bundled); the rest lazy-load on select. */
export const ICON_LIBRARIES = [
  { id: 'lucide', label: 'Lucide' },
  { id: 'tabler', label: 'Tabler' },
  { id: 'phosphor', label: 'Phosphor' },
] as const;
export const DEFAULT_ICON_LIBRARY = 'lucide';

const RADIUS_IDS = Object.keys(GENERATED_RADII);
const ICON_WEIGHT_IDS = ICON_WEIGHTS.map((w) => w.id);
const ICON_LIBRARY_IDS = ICON_LIBRARIES.map((l) => l.id);

// ── Experience axes (CSS-var presets) ────────────────────────────────────────
// Each retones the WHOLE app through a runtime CSS variable (verified against the
// compiled output), so changing a value here applies everywhere — no per-axis
// pickers, no new components, zero bundle cost. They ride inside the generated
// look (below), so persistence + re-apply come for free.

/** Spacing density → Tailwind's master `--spacing` unit (default 0.25rem). Every
 *  padding/margin/gap/size utility is `calc(var(--spacing) * n)`, so this one knob
 *  rescales the entire UI at once. */
export const DENSITY_SCALES: Record<string, { label: string; spacing: number }> = {
  compact: { label: 'Compact', spacing: 0.215 },
  cozy: { label: 'Cozy', spacing: 0.25 },
  spacious: { label: 'Spacious', spacing: 0.3 },
};
export const DEFAULT_DENSITY = 'cozy';

/** Motion personality → the inheriting `--default-transition-*` theme vars that all
 *  `transition` utilities fall back to, so the app's base tempo + easing change at
 *  once (explicit `duration-*`/`ease-*` utilities still win locally). */
export const MOTION_PRESETS: Record<
  string,
  { label: string; duration: string; ease: string }
> = {
  calm: { label: 'Calm', duration: '300ms', ease: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  smooth: { label: 'Smooth', duration: '150ms', ease: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  snappy: { label: 'Snappy', duration: '80ms', ease: 'cubic-bezier(0.34, 1.1, 0.64, 1)' },
};
export const DEFAULT_MOTION = 'smooth';

/** Surface elevation → applied via `data-elevation`; flat (border-only) … lifted
 *  (deep shadow) on the shadcn `[data-slot]` surfaces. */
export const ELEVATION_LEVELS = [
  { id: 'flat', label: 'Flat' },
  { id: 'soft', label: 'Soft' },
  { id: 'lifted', label: 'Lifted' },
] as const;
export const DEFAULT_ELEVATION = 'soft';

/** Surface contrast → applied via `data-contrast` (composes with `.dark`): soft
 *  (gentler) or crisp (sharper, higher-contrast). */
export const CONTRAST_MODES = [
  { id: 'normal', label: 'Normal' },
  { id: 'soft', label: 'Soft' },
  { id: 'crisp', label: 'Crisp' },
] as const;
export const DEFAULT_CONTRAST = 'normal';

/** Curated heading↔body font pairings — generation picks one so headings get a
 *  distinct-but-harmonious voice instead of a random clash. */
export const FONT_PAIRINGS: ReadonlyArray<{ body: string; heading: string }> = [
  { body: 'inter', heading: 'inter' },
  { body: 'inter', heading: 'grotesk' },
  { body: 'humanist', heading: 'grotesk' },
  { body: 'geometric', heading: 'geometric' },
  { body: 'serif', heading: 'serif' },
  { body: 'inter', heading: 'serif' },
  { body: 'humanist', heading: 'slab' },
  { body: 'grotesk', heading: 'mono' },
];

const DENSITY_IDS = Object.keys(DENSITY_SCALES);
const MOTION_IDS = Object.keys(MOTION_PRESETS);
const ELEVATION_IDS = ELEVATION_LEVELS.map((e) => e.id);
const CONTRAST_IDS = CONTRAST_MODES.map((c) => c.id);

// ── Generated look ───────────────────────────────────────────────────────────

/** A full generated look — accent + chart + body/heading font + radius, plus the
 *  experience axes (density / motion / elevation / contrast) that retone the whole
 *  app via CSS-var presets. Every field rides in `customTheme`, so it persists and
 *  re-applies for free — no extra store fields, no extra pickers. */
export interface GeneratedTheme {
  hue: number;
  chartHue: number;
  bodyFontId: string;
  headingFontId: string;
  radiusId: string;
  densityId: string;
  motionId: string;
  elevationId: string;
  contrastId: string;
}

const DEFAULT_LOOK: GeneratedTheme = {
  hue: 290,
  chartHue: 290,
  bodyFontId: 'inter',
  headingFontId: 'inter',
  radiusId: 'default',
  densityId: DEFAULT_DENSITY,
  motionId: DEFAULT_MOTION,
  elevationId: DEFAULT_ELEVATION,
  contrastId: DEFAULT_CONTRAST,
};

/** Fill a partial/legacy look with defaults (older state stored only fontId, and
 *  pre-experience-axes looks omit density/motion/elevation/contrast). */
export function normalizeLook(
  look: (Partial<GeneratedTheme> & { fontId?: string }) | null,
): GeneratedTheme {
  const l = look ?? {};
  const legacyFont = l.fontId;
  return {
    hue: l.hue ?? DEFAULT_LOOK.hue,
    chartHue: l.chartHue ?? DEFAULT_LOOK.chartHue,
    bodyFontId: l.bodyFontId ?? legacyFont ?? DEFAULT_LOOK.bodyFontId,
    headingFontId: l.headingFontId ?? legacyFont ?? DEFAULT_LOOK.headingFontId,
    radiusId: l.radiusId ?? DEFAULT_LOOK.radiusId,
    densityId: l.densityId ?? DEFAULT_LOOK.densityId,
    motionId: l.motionId ?? DEFAULT_LOOK.motionId,
    elevationId: l.elevationId ?? DEFAULT_LOOK.elevationId,
    contrastId: l.contrastId ?? DEFAULT_LOOK.contrastId,
  };
}

const ACCENT_VARS = [
  '--color-primary',
  '--color-ring',
  '--color-sidebar-primary',
  '--color-sidebar-ring',
] as const;
const ACCENT_FG_VARS = [
  '--color-primary-foreground',
  '--color-sidebar-primary-foreground',
] as const;
const SHAPE_VARS = [
  '--font-sans',
  '--font-heading',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
] as const;
const CHART_VARS = [
  '--color-chart-1',
  '--color-chart-2',
  '--color-chart-3',
  '--color-chart-4',
  '--color-chart-5',
] as const;
const CHART_HUE_OFFSETS = [0, 50, 120, 200, 280] as const;

/** Experience-axis vars set inline by the generated look (cleared with it). */
const EXPERIENCE_VARS = [
  '--spacing',
  '--default-transition-duration',
  '--default-transition-timing-function',
] as const;

/** Remove any inline generated vars (accent/font/radius/chart/experience) and the
 *  generated data-axes. Leaves the orthogonal `data-base` / `data-menu` untouched. */
function clearGeneratedTheme(): void {
  const root = document.documentElement;
  for (const v of [
    ...ACCENT_VARS,
    ...ACCENT_FG_VARS,
    ...SHAPE_VARS,
    ...CHART_VARS,
    ...EXPERIENCE_VARS,
  ]) {
    root.style.removeProperty(v);
  }
  delete root.dataset.elevation;
  delete root.dataset.contrast;
}

/**
 * Apply a named preset via `data-theme` (cleared for the default), clearing any
 * generated accent/font/radius/chart vars first. Unknown ids fall back to the
 * default. Pairs with the `.dark` class; orthogonal to base colour + menu.
 */
export function applyThemePreset(id: string): void {
  clearGeneratedTheme();
  const root = document.documentElement;
  const preset = isThemePreset(id) ? id : DEFAULT_PRESET;
  if (preset === DEFAULT_PRESET) {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preset;
  }
}

function norm(hue: number): number {
  return ((Math.round(hue) % 360) + 360) % 360;
}

/** A random accent hue (0–359). */
export function randomThemeHue(): number {
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic theme generation, not security
  return Math.floor(Math.random() * 360);
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/** A fresh random hue at least ~60° from `current`, so each shuffle reads new. */
export function nextRandomHue(current: number | null): number {
  let hue = randomThemeHue();
  for (let i = 0; current != null && hueDistance(hue, current) < 60 && i < 8; i += 1) {
    hue = randomThemeHue();
  }
  return hue;
}

/** Pick a random id, avoiding `exclude` when the pool allows it. */
function pickId(ids: readonly string[], exclude: string | null): string {
  const pool =
    exclude !== null && ids.length > 1 ? ids.filter((id) => id !== exclude) : ids;
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic theme generation, not security
  const idx = Math.floor(Math.random() * pool.length);
  // eslint-disable-next-line security/detect-object-injection -- idx is a bounded random index into a local string[]
  return pool[idx] ?? ids[0] ?? DEFAULT_PRESET;
}

/** Pick a curated heading↔body font pairing, avoiding the current combo. */
function pickPairing(current: GeneratedTheme | null): { body: string; heading: string } {
  const key = current ? `${current.bodyFontId}/${current.headingFontId}` : null;
  const pool =
    key !== null && FONT_PAIRINGS.length > 1
      ? FONT_PAIRINGS.filter((p) => `${p.body}/${p.heading}` !== key)
      : FONT_PAIRINGS;
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic font pairing, not security
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? FONT_PAIRINGS[0] ?? { body: 'inter', heading: 'inter' };
}

/**
 * Generate a fresh full look. The core look (accent / chart / radius / font
 * pairing) always changes; the experience axes (density / motion / elevation /
 * contrast) roll PROBABILISTICALLY, so a shuffle feels like a different product
 * without lurching every dial at once.
 */
export function generateTheme(current: GeneratedTheme | null): GeneratedTheme {
  const hue = nextRandomHue(current?.hue ?? null);
  const pairing = pickPairing(current);
  return {
    hue,
    chartHue: nextRandomHue(hue),
    bodyFontId: pairing.body,
    headingFontId: pairing.heading,
    radiusId: pickId(RADIUS_IDS, current?.radiusId ?? null),
    densityId: chance(0.75)
      ? pickId(DENSITY_IDS, current?.densityId ?? null)
      : (current?.densityId ?? DEFAULT_DENSITY),
    motionId: chance(0.7)
      ? pickId(MOTION_IDS, current?.motionId ?? null)
      : (current?.motionId ?? DEFAULT_MOTION),
    elevationId: chance(0.5)
      ? pickId(ELEVATION_IDS, current?.elevationId ?? null)
      : (current?.elevationId ?? DEFAULT_ELEVATION),
    contrastId: chance(0.4)
      ? pickId(CONTRAST_IDS, current?.contrastId ?? null)
      : (current?.contrastId ?? DEFAULT_CONTRAST),
  };
}

function chance(probability: number): boolean {
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic theme shuffle, not security
  return Math.random() < probability;
}

/**
 * Roll the orthogonal icon axes during a shuffle: ~50% of the time a fresh
 * weight, ~35% a different library — so a shuffle sometimes restyles the icon
 * weight, sometimes swaps the whole set, sometimes both, sometimes neither.
 */
export function shuffleIcons(current: { weight: string; library: string }): {
  weight: string;
  library: string;
} {
  return {
    weight: chance(0.5) ? pickId(ICON_WEIGHT_IDS, current.weight) : current.weight,
    library: chance(0.35) ? pickId(ICON_LIBRARY_IDS, current.library) : current.library,
  };
}

/** How many AuthLayout preview designs exist (TEMP — see AuthLayout variants). */
export const AUTH_VARIANT_COUNT = 3;

/**
 * TEMP (auth-layout preview): a different design index in 0..N-1. Remove
 * together with the `authVariant` store field + the AuthLayout variants.
 */
export function nextAuthVariant(current: number): number {
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic layout preview, not security
  const v = Math.floor(Math.random() * AUTH_VARIANT_COUNT);
  return v === current ? (v + 1) % AUTH_VARIANT_COUNT : v;
}

/** How many AppLayout preview shells exist (TEMP — see AppLayout variants). */
export const APP_VARIANT_COUNT = 3;

/**
 * TEMP (app-layout preview): a different shell index in 0..N-1. Remove together
 * with the `appVariant` store field + the AppLayout variants.
 */
export function nextAppVariant(current: number): number {
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic layout preview, not security
  const v = Math.floor(Math.random() * APP_VARIANT_COUNT);
  return v === current ? (v + 1) % APP_VARIANT_COUNT : v;
}

/**
 * TEMP (toast design preview): the available custom-toast designs. The store
 * holds the active index; `CustomToast` maps it to one of these. Remove together
 * with the `toastVariant` store field + the CustomToast design map.
 */
export const TOAST_VARIANTS = ['soft', 'solid', 'outline', 'accent'] as const;
export type ToastVariant = (typeof TOAST_VARIANTS)[number];
export const DEFAULT_TOAST_VARIANT = 0;

/** TEMP (toast preview): a different toast-design index than the current one. */
export function nextToastVariant(current: number): number {
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic toast preview, not security
  const v = Math.floor(Math.random() * TOAST_VARIANTS.length);
  return v === current ? (v + 1) % TOAST_VARIANTS.length : v;
}

/**
 * TEMP (toast preview): where toasts appear (a subset of sonner's positions, so
 * people can pick a spot they'll notice). The store holds the active value.
 */
export const TOAST_POSITIONS = [
  'top-right',
  'top-center',
  'bottom-right',
  'bottom-center',
] as const;
export type ToastPosition = (typeof TOAST_POSITIONS)[number];
export const DEFAULT_TOAST_POSITION: ToastPosition = 'top-right';

/** TEMP (toast preview): a different toast position than the current one. */
export function nextToastPosition(current: string): ToastPosition {
  const others = TOAST_POSITIONS.filter((p) => p !== current);
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic toast preview, not security
  return others[Math.floor(Math.random() * others.length)] ?? DEFAULT_TOAST_POSITION;
}

/**
 * TEMP shuffle switches — gate which PREVIEW axes `shuffleTheme()` rolls. The core
 * look (accent / chart / fonts / radius / icons) ALWAYS shuffles; these only
 * toggle the temporary previews, and are OFF by default so a normal shuffle stays
 * calm. Flip on/off on request; delete the whole block (+ the gated axes) when the
 * previews are retired.
 */
export const SHUFFLE_TEMP = {
  /** Cycle the AuthLayout (login screen) preview design on shuffle. */
  authLayout: false,
  /** Cycle the AppLayout (app shell) preview design on shuffle. */
  appLayout: false,
  /** Roll the custom-toast design on shuffle. */
  toastVariant: false,
  /** Roll the toast position on shuffle. */
  toastPosition: false,
};

/**
 * Apply a generated full look (shadcn-create-style): accent colour, chart
 * palette, body + heading fonts, and corner radius — all inline on `<html>` so
 * it overrides the base `@theme` tokens in both light and dark (CSP-safe; no
 * injected `<style>`, no remote fonts). Orthogonal to base colour + menu.
 */
export function applyGeneratedTheme(input: GeneratedTheme): void {
  const theme = normalizeLook(input);
  const root = document.documentElement;

  const accent = `oklch(0.58 0.21 ${norm(theme.hue)})`;
  const onAccent = 'oklch(0.985 0 0)';
  delete root.dataset.theme;
  for (const v of ACCENT_VARS) root.style.setProperty(v, accent);
  for (const v of ACCENT_FG_VARS) root.style.setProperty(v, onAccent);

  root.style.setProperty(
    '--font-sans',
    GENERATED_FONTS[theme.bodyFontId]?.stack ?? DEFAULT_FONT_STACK,
  );
  root.style.setProperty(
    '--font-heading',
    GENERATED_FONTS[theme.headingFontId]?.stack ?? DEFAULT_FONT_STACK,
  );

  const base = GENERATED_RADII[theme.radiusId]?.base ?? 0.5;
  root.style.setProperty('--radius-sm', `${base * 0.5}rem`);
  root.style.setProperty('--radius-md', `${base * 0.75}rem`);
  root.style.setProperty('--radius-lg', `${base}rem`);
  root.style.setProperty('--radius-xl', `${base * 1.5}rem`);

  const chart = norm(theme.chartHue);
  let series = 0;
  for (const offset of CHART_HUE_OFFSETS) {
    series += 1;
    root.style.setProperty(
      `--color-chart-${series}`,
      `oklch(0.64 0.17 ${(chart + offset) % 360})`,
    );
  }

  // Density → master spacing unit (every spacing utility is calc(var(--spacing)*n)).
  const spacing = DENSITY_SCALES[theme.densityId]?.spacing ?? 0.25;
  root.style.setProperty('--spacing', `${spacing}rem`);

  // Motion → base transition tempo + easing (inheriting fallback theme vars).
  const motion = MOTION_PRESETS[theme.motionId];
  root.style.setProperty('--default-transition-duration', motion?.duration ?? '150ms');
  root.style.setProperty(
    '--default-transition-timing-function',
    motion?.ease ?? 'cubic-bezier(0.4, 0, 0.2, 1)',
  );

  // Elevation + contrast → data attributes (index.css blocks do the rest; omitted
  // at their defaults so the base look stays pristine).
  if (theme.elevationId && theme.elevationId !== DEFAULT_ELEVATION) {
    root.dataset.elevation = theme.elevationId;
  } else {
    delete root.dataset.elevation;
  }
  if (theme.contrastId && theme.contrastId !== DEFAULT_CONTRAST) {
    root.dataset.contrast = theme.contrastId;
  } else {
    delete root.dataset.contrast;
  }
}

/** Apply a neutral base colour via `data-base` (cleared for `neutral`/unknown). */
export function applyBaseColor(id: string): void {
  const root = document.documentElement;
  if (id === DEFAULT_BASE || !BASE_COLORS.some((b) => b.id === id)) {
    delete root.dataset.base;
  } else {
    root.dataset.base = id;
  }
}

/** Apply a menu surface style via `data-menu` (cleared for `default`/unknown). */
export function applyMenuStyle(id: string): void {
  const root = document.documentElement;
  if (id === 'translucent') {
    root.dataset.menu = 'translucent';
  } else {
    delete root.dataset.menu;
  }
}

/** Apply an icon weight via `--icon-stroke` (cleared for the regular default). */
export function applyIconWeight(id: string): void {
  const root = document.documentElement;
  const weight = ICON_WEIGHTS.find((w) => w.id === id);
  if (!weight || weight.id === DEFAULT_ICON_WEIGHT) {
    root.style.removeProperty('--icon-stroke');
  } else {
    root.style.setProperty('--icon-stroke', String(weight.width));
  }
}

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

const FONT_IDS = Object.keys(GENERATED_FONTS);
const RADIUS_IDS = Object.keys(GENERATED_RADII);
const ICON_WEIGHT_IDS = ICON_WEIGHTS.map((w) => w.id);
const ICON_LIBRARY_IDS = ICON_LIBRARIES.map((l) => l.id);

// ── Generated look ───────────────────────────────────────────────────────────

/** A full generated look — accent + chart anchor + body/heading font + radius. */
export interface GeneratedTheme {
  hue: number;
  chartHue: number;
  bodyFontId: string;
  headingFontId: string;
  radiusId: string;
}

const DEFAULT_LOOK: GeneratedTheme = {
  hue: 290,
  chartHue: 290,
  bodyFontId: 'inter',
  headingFontId: 'inter',
  radiusId: 'default',
};

/** Fill a partial/legacy look with defaults (older state stored only fontId). */
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

/** Remove any inline generated vars (accent/font/radius/chart). Leaves the
 *  orthogonal `data-base` / `data-menu` axes untouched. */
function clearGeneratedTheme(): void {
  const root = document.documentElement;
  for (const v of [...ACCENT_VARS, ...ACCENT_FG_VARS, ...SHAPE_VARS, ...CHART_VARS]) {
    root.style.removeProperty(v);
  }
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

/** Generate a fresh full look; each axis differs from `current`. */
export function generateTheme(current: GeneratedTheme | null): GeneratedTheme {
  const hue = nextRandomHue(current?.hue ?? null);
  return {
    hue,
    chartHue: nextRandomHue(hue),
    bodyFontId: pickId(FONT_IDS, current?.bodyFontId ?? null),
    headingFontId: pickId(FONT_IDS, current?.headingFontId ?? null),
    radiusId: pickId(RADIUS_IDS, current?.radiusId ?? null),
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

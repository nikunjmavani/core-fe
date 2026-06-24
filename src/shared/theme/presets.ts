export interface ThemePreset {
  id: string;
  label: string;
}

/**
 * Built-in theme presets. `default` uses the base `@theme` palette (no
 * `data-theme` attribute); the others apply accent overrides via the
 * `[data-theme='<id>']` blocks in `src/index.css`, composed with the `.dark`
 * class so light/dark mode and the preset are independent axes.
 */
export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: 'default', label: 'Default' },
  { id: 'violet', label: 'Violet' },
  { id: 'emerald', label: 'Emerald' },
] as const;

export const DEFAULT_PRESET = 'default';

/** Synthetic preset id for a shuffled/generated theme (not in THEME_PRESETS). */
export const GENERATED_PRESET = 'custom';

export function isThemePreset(id: string): boolean {
  return THEME_PRESETS.some((preset) => preset.id === id);
}

// ── Generated ("shuffle") theme ──────────────────────────────────────────────

/** A full generated look: accent hue + font + corner radius (shadcn-create style). */
export interface GeneratedTheme {
  /** Accent hue, 0–359. */
  hue: number;
  /** Key into {@link GENERATED_FONTS}. */
  fontId: string;
  /** Key into {@link GENERATED_RADII}. */
  radiusId: string;
}

const DEFAULT_FONT_STACK = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

/**
 * Web-safe `--font-sans` stacks for the generator. The CSP is `font-src 'self'`,
 * so remote fonts (e.g. Google Fonts) can't load — these are families already
 * present on common OSes, giving a visibly different feel without a network
 * fetch.
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
  sharp: { label: 'Sharp', base: 0 },
  default: { label: 'Default', base: 0.5 },
  rounded: { label: 'Rounded', base: 0.75 },
  round: { label: 'Round', base: 1 },
};

const FONT_IDS = Object.keys(GENERATED_FONTS);
const RADIUS_IDS = Object.keys(GENERATED_RADII);

/** Accent tokens the presets + the generator drive (mirrors the index.css blocks). */
const ACCENT_VARS = [
  '--color-primary',
  '--color-ring',
  '--color-sidebar-primary',
] as const;
const ACCENT_FG_VARS = [
  '--color-primary-foreground',
  '--color-sidebar-primary-foreground',
] as const;
/** Shape tokens (font + radius scale) the generator drives. */
const SHAPE_VARS = [
  '--font-sans',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
] as const;

/** Remove any inline generated vars so a named preset (CSS) takes over. */
function clearGeneratedTheme(): void {
  const root = document.documentElement;
  for (const v of [...ACCENT_VARS, ...ACCENT_FG_VARS, ...SHAPE_VARS]) {
    root.style.removeProperty(v);
  }
}

/**
 * Apply a named preset by setting `data-theme` on `<html>` (cleared for the
 * default). Also clears any generated inline vars (accent + font + radius) so
 * the preset's CSS wins. Unknown ids fall back to the default.
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

/** A random accent hue (0–359) for the theme generator. */
export function randomThemeHue(): number {
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic theme generation, not security
  return Math.floor(Math.random() * 360);
}

/** Shortest distance between two hues on the 0–360 colour wheel. */
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

/** Generate a fresh full look (accent + font + radius); each axis differs from `current`. */
export function generateTheme(current: GeneratedTheme | null): GeneratedTheme {
  return {
    hue: nextRandomHue(current?.hue ?? null),
    fontId: pickId(FONT_IDS, current?.fontId ?? null),
    radiusId: pickId(RADIUS_IDS, current?.radiusId ?? null),
  };
}

/**
 * Apply a generated full-look theme (shadcn-create-style "shuffle"): accent
 * colour + typography + corner radius. Everything is set inline on `<html>` so
 * it overrides the base `@theme` tokens in both light and dark (CSP-safe;
 * mirrors the org-brand engine — no injected `<style>`, no remote fonts). Unlike
 * the fixed presets, every call is a fresh look.
 */
export function applyGeneratedTheme(theme: GeneratedTheme): void {
  const root = document.documentElement;

  // Accent — a mid-lightness, saturated hue reads on light and dark.
  const h = ((Math.round(theme.hue) % 360) + 360) % 360;
  const accent = `oklch(0.58 0.21 ${h})`;
  const onAccent = 'oklch(0.985 0 0)';
  // A named preset block must not also apply on top of the generated vars.
  delete root.dataset.theme;
  for (const v of ACCENT_VARS) root.style.setProperty(v, accent);
  for (const v of ACCENT_FG_VARS) root.style.setProperty(v, onAccent);

  // Typography — whole-app font via --font-sans.
  const font = GENERATED_FONTS[theme.fontId];
  root.style.setProperty('--font-sans', font?.stack ?? DEFAULT_FONT_STACK);

  // Corner radius — derive the sm/md/lg/xl scale from a base (lg) value.
  const base = GENERATED_RADII[theme.radiusId]?.base ?? 0.5;
  root.style.setProperty('--radius-sm', `${base * 0.5}rem`);
  root.style.setProperty('--radius-md', `${base * 0.75}rem`);
  root.style.setProperty('--radius-lg', `${base}rem`);
  root.style.setProperty('--radius-xl', `${base * 1.5}rem`);
}

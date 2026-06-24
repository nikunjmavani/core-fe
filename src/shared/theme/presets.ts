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

/** Remove any inline generated-accent vars so a named preset (CSS) takes over. */
function clearGeneratedTheme(): void {
  const root = document.documentElement;
  for (const v of [...ACCENT_VARS, ...ACCENT_FG_VARS]) root.style.removeProperty(v);
}

/**
 * Apply a named preset by setting `data-theme` on `<html>` (cleared for the
 * default). Also clears any generated-accent inline vars so the preset's CSS
 * wins. Unknown ids fall back to the default. Pairs with the `.dark` class.
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

/**
 * Generate + apply a random accent theme from a hue (shadcn-create-style
 * "shuffle"). Sets the same accent tokens the named presets override —
 * `--color-primary` / `--color-ring` / `--color-sidebar-primary` (+ their
 * foregrounds) — inline on `<html>` so it overrides the base palette in both
 * light and dark (CSP-safe; mirrors the org-brand engine). Unlike the fixed
 * presets, every call is a fresh palette.
 */
export function applyGeneratedTheme(hue: number): void {
  const root = document.documentElement;
  const h = ((Math.round(hue) % 360) + 360) % 360;
  // A mid-lightness, saturated accent reads on both light and dark backgrounds.
  const accent = `oklch(0.58 0.21 ${h})`;
  const onAccent = 'oklch(0.985 0 0)';
  // A named preset block must not also apply on top of the generated vars.
  delete root.dataset.theme;
  for (const v of ACCENT_VARS) root.style.setProperty(v, accent);
  for (const v of ACCENT_FG_VARS) root.style.setProperty(v, onAccent);
}

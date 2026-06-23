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

export function isThemePreset(id: string): boolean {
  return THEME_PRESETS.some((preset) => preset.id === id);
}

/**
 * Apply a named preset by setting `data-theme` on `<html>` (cleared for the
 * default). Unknown ids fall back to the default. Pairs with the `.dark` class
 * set by the theme store.
 */
export function applyThemePreset(id: string): void {
  const root = document.documentElement;
  const preset = isThemePreset(id) ? id : DEFAULT_PRESET;
  if (preset === DEFAULT_PRESET) {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preset;
  }
}

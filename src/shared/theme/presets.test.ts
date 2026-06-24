import { afterEach, describe, expect, it } from 'vitest';

import {
  applyGeneratedTheme,
  applyThemePreset,
  GENERATED_PRESET,
  isThemePreset,
  nextRandomHue,
  randomThemeHue,
  THEME_PRESETS,
} from './presets.ts';

const ACCENT_VARS = [
  '--color-primary',
  '--color-ring',
  '--color-sidebar-primary',
  '--color-primary-foreground',
  '--color-sidebar-primary-foreground',
];

afterEach(() => {
  delete document.documentElement.dataset.theme;
  for (const v of ACCENT_VARS) document.documentElement.style.removeProperty(v);
});

describe('theme presets', () => {
  it('includes the default preset', () => {
    expect(THEME_PRESETS.some((p) => p.id === 'default')).toBe(true);
  });

  it('isThemePreset validates known ids', () => {
    expect(isThemePreset('violet')).toBe(true);
    expect(isThemePreset('default')).toBe(true);
    expect(isThemePreset('nope')).toBe(false);
  });

  it('sets data-theme for a non-default preset', () => {
    applyThemePreset('violet');
    expect(document.documentElement.dataset.theme).toBe('violet');
  });

  it('clears data-theme for the default preset', () => {
    applyThemePreset('violet');
    applyThemePreset('default');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('falls back to default for unknown ids', () => {
    applyThemePreset('bogus');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

describe('generated themes (shuffle)', () => {
  it('GENERATED_PRESET is not a named preset', () => {
    expect(isThemePreset(GENERATED_PRESET)).toBe(false);
  });

  it('randomThemeHue returns a hue in 0–359', () => {
    for (let i = 0; i < 50; i += 1) {
      const h = randomThemeHue();
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });

  it('nextRandomHue returns a valid hue (with or without a current)', () => {
    expect(nextRandomHue(100)).toBeGreaterThanOrEqual(0);
    expect(nextRandomHue(100)).toBeLessThan(360);
    expect(nextRandomHue(null)).toBeLessThan(360);
  });

  it('applyGeneratedTheme sets inline accent vars and clears data-theme', () => {
    applyThemePreset('violet'); // start from a named preset
    applyGeneratedTheme(200);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    const primary = document.documentElement.style.getPropertyValue('--color-primary');
    expect(primary).toContain('oklch');
    expect(primary).toContain('200');
  });

  it('applyThemePreset clears any generated accent vars', () => {
    applyGeneratedTheme(200);
    applyThemePreset('violet');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
    expect(document.documentElement.dataset.theme).toBe('violet');
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import {
  applyGeneratedTheme,
  applyThemePreset,
  GENERATED_FONTS,
  GENERATED_PRESET,
  GENERATED_RADII,
  generateTheme,
  isThemePreset,
  nextRandomHue,
  randomThemeHue,
  THEME_PRESETS,
} from './presets.ts';

const GENERATED_VARS = [
  '--color-primary',
  '--color-ring',
  '--color-sidebar-primary',
  '--color-sidebar-ring',
  '--color-primary-foreground',
  '--color-sidebar-primary-foreground',
  '--font-sans',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--color-chart-1',
  '--color-chart-2',
  '--color-chart-3',
  '--color-chart-4',
  '--color-chart-5',
];

afterEach(() => {
  delete document.documentElement.dataset.theme;
  for (const v of GENERATED_VARS) document.documentElement.style.removeProperty(v);
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
  const sample = { hue: 200, fontId: 'serif', radiusId: 'round' };

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

  it('generateTheme yields a valid full look (hue + known font + known radius)', () => {
    const t = generateTheme(null);
    expect(t.hue).toBeGreaterThanOrEqual(0);
    expect(t.hue).toBeLessThan(360);
    expect(GENERATED_FONTS[t.fontId]).toBeDefined();
    expect(GENERATED_RADII[t.radiusId]).toBeDefined();
  });

  it('applyGeneratedTheme sets accent + font + radius and clears data-theme', () => {
    applyThemePreset('violet'); // start from a named preset
    applyGeneratedTheme(sample);
    const style = document.documentElement.style;
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(style.getPropertyValue('--color-primary')).toContain('oklch');
    expect(style.getPropertyValue('--color-primary')).toContain('200');
    // font + radius + chart palette are part of the generated "full look"
    expect(style.getPropertyValue('--font-sans')).toContain('Georgia');
    expect(style.getPropertyValue('--radius-lg')).toBe('1rem');
    expect(style.getPropertyValue('--color-chart-1')).toContain('oklch');
    expect(style.getPropertyValue('--color-chart-5')).toContain('oklch');
    expect(style.getPropertyValue('--color-sidebar-ring')).toContain('oklch');
  });

  it('applyThemePreset clears any generated accent/font/radius/chart vars', () => {
    applyGeneratedTheme(sample);
    applyThemePreset('violet');
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--color-primary')).toBe('');
    expect(style.getPropertyValue('--font-sans')).toBe('');
    expect(style.getPropertyValue('--radius-lg')).toBe('');
    expect(style.getPropertyValue('--color-chart-1')).toBe('');
    expect(document.documentElement.dataset.theme).toBe('violet');
  });
});

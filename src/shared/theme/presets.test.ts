import { afterEach, describe, expect, it } from 'vitest';

import {
  applyBaseColor,
  applyGeneratedTheme,
  applyMenuStyle,
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
  '--font-heading',
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
  const root = document.documentElement;
  delete root.dataset.theme;
  delete root.dataset.base;
  delete root.dataset.menu;
  for (const v of GENERATED_VARS) root.style.removeProperty(v);
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
  const sample = {
    hue: 200,
    chartHue: 320,
    bodyFontId: 'serif',
    headingFontId: 'mono',
    radiusId: 'round',
  };

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

  it('generateTheme yields a valid full look (hue + chart + known fonts + radius)', () => {
    const t = generateTheme(null);
    expect(t.hue).toBeGreaterThanOrEqual(0);
    expect(t.hue).toBeLessThan(360);
    expect(t.chartHue).toBeLessThan(360);
    expect(GENERATED_FONTS[t.bodyFontId]).toBeDefined();
    expect(GENERATED_FONTS[t.headingFontId]).toBeDefined();
    expect(GENERATED_RADII[t.radiusId]).toBeDefined();
  });

  it('applyGeneratedTheme sets accent + fonts + radius + chart, clears data-theme', () => {
    applyThemePreset('violet'); // start from a named preset
    applyGeneratedTheme(sample);
    const style = document.documentElement.style;
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(style.getPropertyValue('--color-primary')).toContain('200');
    expect(style.getPropertyValue('--font-sans')).toContain('Georgia'); // serif
    expect(style.getPropertyValue('--font-heading')).toContain('Courier'); // mono
    expect(style.getPropertyValue('--radius-lg')).toBe('1rem');
    expect(style.getPropertyValue('--color-chart-1')).toContain('oklch');
    expect(style.getPropertyValue('--color-sidebar-ring')).toContain('oklch');
  });

  it('applyThemePreset clears any generated accent/font/radius/chart vars', () => {
    applyGeneratedTheme(sample);
    applyThemePreset('violet');
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--color-primary')).toBe('');
    expect(style.getPropertyValue('--font-sans')).toBe('');
    expect(style.getPropertyValue('--font-heading')).toBe('');
    expect(style.getPropertyValue('--radius-lg')).toBe('');
    expect(style.getPropertyValue('--color-chart-1')).toBe('');
    expect(document.documentElement.dataset.theme).toBe('violet');
  });
});

describe('orthogonal base colour + menu', () => {
  it('applyBaseColor sets/clears data-base', () => {
    applyBaseColor('stone');
    expect(document.documentElement.dataset.base).toBe('stone');
    applyBaseColor('neutral');
    expect(document.documentElement.dataset.base).toBeUndefined();
    applyBaseColor('bogus');
    expect(document.documentElement.dataset.base).toBeUndefined();
  });

  it('applyMenuStyle sets/clears data-menu', () => {
    applyMenuStyle('translucent');
    expect(document.documentElement.dataset.menu).toBe('translucent');
    applyMenuStyle('default');
    expect(document.documentElement.dataset.menu).toBeUndefined();
  });
});

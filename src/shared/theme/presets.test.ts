import { afterEach, describe, expect, it } from 'vitest';

import { applyThemePreset, isThemePreset, THEME_PRESETS } from './presets.ts';

afterEach(() => {
  delete document.documentElement.dataset.theme;
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

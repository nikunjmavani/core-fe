import { useThemeStore } from './useThemeStore.ts';

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'system', preset: 'default', customHue: null });
    delete document.documentElement.dataset.theme;
    for (const v of [
      '--color-primary',
      '--color-ring',
      '--color-sidebar-primary',
      '--color-primary-foreground',
      '--color-sidebar-primary-foreground',
    ]) {
      document.documentElement.style.removeProperty(v);
    }
  });

  it('initial state is system', () => {
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('setTheme("dark") updates theme', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setTheme("light") updates theme', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('setPreset applies a valid preset via data-theme', () => {
    useThemeStore.getState().setPreset('violet');
    expect(useThemeStore.getState().preset).toBe('violet');
    expect(document.documentElement.dataset.theme).toBe('violet');
  });

  it('setPreset falls back to default for unknown ids (clears data-theme)', () => {
    useThemeStore.getState().setPreset('violet');
    useThemeStore.getState().setPreset('bogus');
    expect(useThemeStore.getState().preset).toBe('default');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('shuffleTheme generates a custom theme with an inline accent', () => {
    useThemeStore.getState().setPreset('violet');
    useThemeStore.getState().shuffleTheme();
    const state = useThemeStore.getState();
    expect(state.preset).toBe('custom');
    expect(typeof state.customHue).toBe('number');
    // a generated theme drops data-theme in favour of inline accent vars
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toContain(
      'oklch',
    );
  });

  it('setPreset clears a generated custom hue', () => {
    useThemeStore.getState().shuffleTheme();
    expect(useThemeStore.getState().customHue).not.toBeNull();
    useThemeStore.getState().setPreset('violet');
    expect(useThemeStore.getState().customHue).toBeNull();
    expect(useThemeStore.getState().preset).toBe('violet');
  });
});

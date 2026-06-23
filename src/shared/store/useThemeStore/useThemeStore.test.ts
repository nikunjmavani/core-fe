import { useThemeStore } from './useThemeStore.ts';

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'system', preset: 'default' });
    delete document.documentElement.dataset.theme;
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

  it('shuffleTheme picks a preset different from the current one', () => {
    useThemeStore.getState().setPreset('violet');
    useThemeStore.getState().shuffleTheme();
    expect(useThemeStore.getState().preset).not.toBe('violet');
  });
});

import { useThemeStore } from './useThemeStore.ts';

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({
      theme: 'system',
      preset: 'default',
      customTheme: null,
      baseId: 'neutral',
      menu: 'default',
    });
    const root = document.documentElement;
    delete root.dataset.theme;
    delete root.dataset.base;
    delete root.dataset.menu;
    for (const v of [
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
    ]) {
      root.style.removeProperty(v);
    }
  });

  it('initial state is system', () => {
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('setTheme("dark") updates theme', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
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

  it('shuffleTheme generates a full custom look', () => {
    useThemeStore.getState().setPreset('violet');
    useThemeStore.getState().shuffleTheme();
    const state = useThemeStore.getState();
    expect(state.preset).toBe('custom');
    expect(state.customTheme).toMatchObject({
      hue: expect.any(Number),
      chartHue: expect.any(Number),
      bodyFontId: expect.any(String),
      headingFontId: expect.any(String),
      radiusId: expect.any(String),
    });
    expect(document.documentElement.dataset.theme).toBeUndefined();
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--color-primary')).toContain('oklch');
    expect(style.getPropertyValue('--font-sans')).not.toBe('');
    expect(style.getPropertyValue('--font-heading')).not.toBe('');
    expect(style.getPropertyValue('--radius-lg')).not.toBe('');
  });

  it('updateLook sets one axis and switches to the custom look', () => {
    useThemeStore.getState().updateLook({ hue: 200 });
    const state = useThemeStore.getState();
    expect(state.preset).toBe('custom');
    expect(state.customTheme?.hue).toBe(200);
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toContain(
      '200',
    );
  });

  it('setBaseColor / setMenu apply via data-attributes', () => {
    useThemeStore.getState().setBaseColor('stone');
    expect(useThemeStore.getState().baseId).toBe('stone');
    expect(document.documentElement.dataset.base).toBe('stone');

    useThemeStore.getState().setMenu('translucent');
    expect(useThemeStore.getState().menu).toBe('translucent');
    expect(document.documentElement.dataset.menu).toBe('translucent');
  });

  it('setPreset clears a generated custom look (keeps base/menu)', () => {
    useThemeStore.getState().shuffleTheme();
    useThemeStore.getState().setBaseColor('slate');
    expect(useThemeStore.getState().customTheme).not.toBeNull();
    useThemeStore.getState().setPreset('violet');
    expect(useThemeStore.getState().customTheme).toBeNull();
    expect(useThemeStore.getState().preset).toBe('violet');
    // base colour is orthogonal — survives a preset change
    expect(useThemeStore.getState().baseId).toBe('slate');
  });
});

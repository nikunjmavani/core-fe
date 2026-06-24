import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

import { AccountAppearancePanel } from './AccountAppearancePanel.tsx';

describe('AccountAppearancePanel', () => {
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
  });

  it('renders the mode + colour + type pickers', () => {
    render(<AccountAppearancePanel />);
    expect(screen.getByTestId('settings-section-appearance')).toBeInTheDocument();
    expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
    expect(screen.getByTestId('accent-violet')).toBeInTheDocument();
    expect(screen.getByTestId('chart-blue')).toBeInTheDocument();
    expect(screen.getByTestId('base-stone')).toBeInTheDocument();
    expect(screen.getByTestId('font-body')).toBeInTheDocument();
    expect(screen.getByTestId('radius-round')).toBeInTheDocument();
    expect(screen.getByTestId('menu-translucent')).toBeInTheDocument();
    expect(screen.getByTestId('icon-bold')).toBeInTheDocument();
    expect(screen.getByTestId('theme-shuffle')).toBeInTheDocument();
  });

  it('picking an accent colour switches to the custom look', async () => {
    const user = userEvent.setup();
    render(<AccountAppearancePanel />);
    await user.click(screen.getByTestId('accent-violet'));
    expect(useThemeStore.getState().preset).toBe('custom');
    expect(useThemeStore.getState().customTheme?.hue).toBe(290);
    expect(await screen.findByTestId('preset-custom')).toBeInTheDocument();
  });

  it('picking a base colour applies it via data-base (orthogonal)', async () => {
    const user = userEvent.setup();
    render(<AccountAppearancePanel />);
    await user.click(screen.getByTestId('base-stone'));
    expect(useThemeStore.getState().baseId).toBe('stone');
    expect(document.documentElement.dataset.base).toBe('stone');
  });

  it('picking an icon weight applies it (orthogonal)', async () => {
    const user = userEvent.setup();
    render(<AccountAppearancePanel />);
    await user.click(screen.getByTestId('icon-bold'));
    expect(useThemeStore.getState().iconWeight).toBe('bold');
  });

  it('shuffle generates a custom look', async () => {
    const user = userEvent.setup();
    render(<AccountAppearancePanel />);
    await user.click(screen.getByTestId('theme-shuffle'));
    expect(useThemeStore.getState().preset).toBe('custom');
  });
});

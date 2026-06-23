import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

import { AccountAppearancePanel } from './AccountAppearancePanel.tsx';

describe('AccountAppearancePanel', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'system', preset: 'default' });
    delete document.documentElement.dataset.theme;
  });

  it('renders the panel with theme + accent pickers', () => {
    render(<AccountAppearancePanel />);
    expect(screen.getByTestId('settings-section-appearance')).toBeInTheDocument();
    expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
    expect(screen.getByTestId('preset-violet')).toBeInTheDocument();
    expect(screen.getByTestId('theme-shuffle')).toBeInTheDocument();
  });

  it('selecting an accent preset applies it via the store', async () => {
    const user = userEvent.setup();
    render(<AccountAppearancePanel />);
    await user.click(screen.getByTestId('preset-violet'));
    expect(useThemeStore.getState().preset).toBe('violet');
    expect(document.documentElement.dataset.theme).toBe('violet');
  });

  it('shuffle changes the active preset', async () => {
    const user = userEvent.setup();
    useThemeStore.setState({ theme: 'system', preset: 'violet' });
    render(<AccountAppearancePanel />);
    await user.click(screen.getByTestId('theme-shuffle'));
    expect(useThemeStore.getState().preset).not.toBe('violet');
  });
});

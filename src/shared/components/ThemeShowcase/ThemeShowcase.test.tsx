import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

import { ThemeShowcase } from './ThemeShowcase.tsx';

// Real theme store (works in jsdom); plain render — the bar is routing-free.
beforeEach(() => {
  useThemeStore.setState({ theme: 'system', preset: 'default', customTheme: null });
});

describe('ThemeShowcase', () => {
  it('renders the theme bar with the active preset label + palette', () => {
    render(<ThemeShowcase />);
    expect(screen.getByTestId('dashboard-theme-showcase')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-theme-label')).toHaveTextContent('Default');
    expect(screen.getByTestId('dashboard-theme-palette')).toBeInTheDocument();
  });

  it('shuffling generates a custom theme and updates the label', async () => {
    const user = userEvent.setup();
    render(<ThemeShowcase />);
    await user.click(screen.getByTestId('dashboard-theme-shuffle'));
    expect(useThemeStore.getState().preset).toBe('custom');
    expect(screen.getByTestId('dashboard-theme-label')).toHaveTextContent('Custom');
  });
});

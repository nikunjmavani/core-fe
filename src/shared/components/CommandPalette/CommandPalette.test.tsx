import { screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { CommandPalette } from './CommandPalette.tsx';

describe('CommandPalette', () => {
  beforeAll(() => {
    // cmdk scrolls the selected item into view; jsdom has no scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    useUIStore.setState({ commandPaletteOpen: true });
  });

  it('renders navigation and settings commands when open', async () => {
    renderWithProviders(<CommandPalette />);

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('User settings')).toBeInTheDocument();
    expect(screen.getByText('Organization settings')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    useUIStore.setState({ commandPaletteOpen: false });
    renderWithProviders(<CommandPalette />);
    expect(screen.queryByText('User settings')).not.toBeInTheDocument();
  });
});

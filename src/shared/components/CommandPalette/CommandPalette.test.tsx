import { screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';
import type { MeContext } from '@/shared/tenancy/me-context.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { CommandPalette } from './CommandPalette.tsx';

const { useMeContextMock } = vi.hoisted(() => ({ useMeContextMock: vi.fn() }));
vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: useMeContextMock,
}));

/** Minimal me/context the palette reads: active-org type + the org list. */
function meContext(orgType: 'TEAM' | 'PERSONAL'): MeContext {
  return {
    activeOrganization: { type: orgType },
    organizations: [],
  } as unknown as MeContext;
}

describe('CommandPalette', () => {
  beforeAll(() => {
    // cmdk scrolls the selected item into view; jsdom has no scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    useUIStore.setState({ commandPaletteOpen: true });
    useMeContextMock.mockReturnValue({ data: meContext('TEAM') });
  });

  it('renders navigation and settings commands when open', async () => {
    renderWithProviders(<CommandPalette />);

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('User settings')).toBeInTheDocument();
    expect(screen.getByText('Organization settings')).toBeInTheDocument();
  });

  // Regression (F4): Organization settings has no sections on a personal workspace
  // (it would just fall back to account/profile), so the command must be hidden.
  it('hides Organization settings on a personal workspace', async () => {
    useMeContextMock.mockReturnValue({ data: meContext('PERSONAL') });
    renderWithProviders(<CommandPalette />);

    expect(await screen.findByText('User settings')).toBeInTheDocument();
    expect(screen.queryByText('Organization settings')).not.toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    useUIStore.setState({ commandPaletteOpen: false });
    renderWithProviders(<CommandPalette />);
    expect(screen.queryByText('User settings')).not.toBeInTheDocument();
  });
});

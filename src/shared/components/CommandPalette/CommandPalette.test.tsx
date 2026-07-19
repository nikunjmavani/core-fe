import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';
import type { MeContext } from '@/shared/tenancy/me-context.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { CommandPalette } from './CommandPalette.tsx';

const { useMeContextMock, navigateMock } = vi.hoisted(() => ({
  useMeContextMock: vi.fn(),
  navigateMock: vi.fn(),
}));
vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: useMeContextMock,
}));
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useNavigate: () => navigateMock };
});

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
    useOrganizationStore.setState({ permissions: [] });
    useMeContextMock.mockReturnValue({ data: meContext('TEAM') });
    navigateMock.mockClear();
  });

  it('renders navigation and settings commands when open', async () => {
    renderWithProviders(<CommandPalette />);

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('User settings')).toBeInTheDocument();
    expect(screen.getByText('Organization settings')).toBeInTheDocument();
  });

  it('navigates to organization settings when the command is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.click(await screen.findByText('Organization settings'));

    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: '.' }));
  });

  // F2: settings destinations are searchable in the palette (were "No results").
  it('lists settings destinations as searchable commands', async () => {
    useOrganizationStore.setState({ permissions: ['organization:read'] });
    renderWithProviders(<CommandPalette />);

    // Account sections need only a signed-in user; Billing needs organization:read.
    expect(await screen.findByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('finds a settings section by keyword (billing → Billing)', async () => {
    useOrganizationStore.setState({ permissions: ['organization:read'] });
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.type(
      await screen.findByPlaceholderText('Type a command or search...'),
      'billing',
    );

    expect(await screen.findByText('Billing')).toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('navigates to a settings section when selected', async () => {
    useOrganizationStore.setState({ permissions: ['organization:read'] });
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.click(await screen.findByText('Billing'));

    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: '.', hash: expect.stringContaining('billing') }),
    );
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

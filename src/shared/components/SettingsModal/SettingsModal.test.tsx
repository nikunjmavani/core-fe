import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrganizationPermission } from '@/core/rbac/policies.ts';
import type { AuthUser } from '@/shared/auth/types.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { SettingsModal } from './SettingsModal.tsx';

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

const { useMeContextMock } = vi.hoisted(() => ({ useMeContextMock: vi.fn() }));
vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: useMeContextMock,
  meContextQueryKey: ['auth', 'me-context'],
}));

const USER = { id: 'usr_1', email: 'u@e.com', role: 'user' } as AuthUser;
const ALL_PERMS: OrganizationPermission[] = [
  'organization:read',
  'membership:read',
  'role:read',
  'webhook:read',
];
const meCtx = (type: 'PERSONAL' | 'TEAM') => ({
  data: { activeOrganization: { type } },
  isLoading: false,
  isError: false,
});

describe('SettingsModal', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: USER, isAuthenticated: true });
    useOrganizationStore.getState().clearOrganization();
    // default: context still loading → permission-only gating
    useMeContextMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
  });

  it('renders nothing without a settings hash', () => {
    renderWithProviders(<SettingsModal />);
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });

  it('opens at the section addressed by the hash', async () => {
    renderWithProviders(<SettingsModal />, {
      initialEntries: ['/#settings/account/profile'],
    });
    expect(await screen.findByTestId('settings-modal')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-profile')).toBeInTheDocument();
  });

  it('a team org shows member + role management in the nav', async () => {
    useOrganizationStore.getState().setOrganization('org_team', 'team');
    useOrganizationStore.getState().setPermissions(ALL_PERMS);
    useMeContextMock.mockReturnValue(meCtx('TEAM'));
    renderWithProviders(<SettingsModal />, {
      initialEntries: ['/#settings/organization/general'],
    });
    expect(
      await screen.findByTestId('settings-nav-organization-members'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-organization-roles')).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-organization-billing')).toBeInTheDocument();
  });

  it('a personal org hides member/role management but keeps billing', async () => {
    useOrganizationStore.getState().setOrganization('org_personal', 'personal');
    useOrganizationStore.getState().setPermissions(ALL_PERMS);
    useMeContextMock.mockReturnValue(meCtx('PERSONAL'));
    renderWithProviders(<SettingsModal />, {
      initialEntries: ['/#settings/organization/general'],
    });
    expect(
      await screen.findByTestId('settings-nav-organization-general'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-organization-billing')).toBeInTheDocument();
    expect(
      screen.queryByTestId('settings-nav-organization-members'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('settings-nav-organization-roles'),
    ).not.toBeInTheDocument();
  });
});

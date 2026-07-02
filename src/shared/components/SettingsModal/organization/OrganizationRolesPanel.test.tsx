import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { useRolesMock, deleteMutate } = vi.hoisted(() => ({
  useRolesMock: vi.fn(),
  deleteMutate: vi.fn(),
}));
vi.mock('@/shared/hooks/useRoles/index.ts', () => ({
  useRoles: useRolesMock,
  useDeleteRole: () => ({ mutate: deleteMutate }),
}));
vi.mock('@/shared/notify/notify-deferred.ts', () => ({
  notifyDeferredCommit: ({ onCommit }: { onCommit: () => void }) => onCommit(),
}));

import { OrganizationRolesPanel } from './OrganizationRolesPanel.tsx';

const CUSTOM_ROLE = {
  id: 'rol_1',
  name: 'Billing Manager',
  description: 'Manages billing',
  permissions: ['subscription:manage'],
  memberCount: 2,
  isSystem: false,
};
const SYSTEM_ROLE = {
  id: 'rol_owner',
  name: 'Owner',
  description: 'Full access',
  permissions: [],
  memberCount: 1,
  isSystem: true,
};

function rolesQueryResult(
  overrides: { rows?: (typeof CUSTOM_ROLE | typeof SYSTEM_ROLE)[] } & Record<
    string,
    unknown
  >,
) {
  return {
    rows: overrides.rows ?? [],
    isPending: false,
    isError: false,
    isFetching: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  };
}

function setCanManage(value: boolean) {
  useAuthStore.setState({
    user: { id: 'u', email: 'a@b.test', role: 'user' },
    isAuthenticated: true,
  });
  useOrganizationStore.setState({
    organizationType: value ? 'TEAM' : 'PERSONAL',
    permissions: value ? ['role:manage'] : [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useOrganizationStore.getState().clearOrganization();
});

describe('OrganizationRolesPanel', () => {
  it('shows an empty state when there are no roles', () => {
    useRolesMock.mockReturnValue(rolesQueryResult({ rows: [] }));
    render(<OrganizationRolesPanel />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('lists roles; only custom roles are deletable, and only with the permission', () => {
    useRolesMock.mockReturnValue(rolesQueryResult({ rows: [CUSTOM_ROLE, SYSTEM_ROLE] }));
    setCanManage(true);
    render(<OrganizationRolesPanel />);
    expect(screen.getByText('Billing Manager')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByTestId('role-delete-rol_1')).toBeInTheDocument();
    expect(screen.queryByTestId('role-delete-rol_owner')).not.toBeInTheDocument();
  });

  it('hides delete controls without the manage-roles permission', () => {
    useRolesMock.mockReturnValue(rolesQueryResult({ rows: [CUSTOM_ROLE] }));
    setCanManage(false);
    render(<OrganizationRolesPanel />);
    expect(screen.queryByTestId('role-delete-rol_1')).not.toBeInTheDocument();
  });

  it('confirms and deletes a custom role', async () => {
    useRolesMock.mockReturnValue(rolesQueryResult({ rows: [CUSTOM_ROLE] }));
    setCanManage(true);
    const user = userEvent.setup();
    render(<OrganizationRolesPanel />);

    await user.click(screen.getByTestId('role-delete-rol_1'));
    await user.click(screen.getByTestId('confirm-accept'));

    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('rol_1'));
  });

  it('forwards the debounced search term to the hook', async () => {
    useRolesMock.mockReturnValue(rolesQueryResult({ rows: [] }));
    const user = userEvent.setup();
    render(<OrganizationRolesPanel />);

    await user.type(screen.getByTestId('roles-search'), 'bill');
    await waitFor(() =>
      expect(useRolesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'bill', sort: 'name', order: 'asc' }),
      ),
    );
  });

  it('forwards the selected sort preset to the hook', async () => {
    useRolesMock.mockReturnValue(rolesQueryResult({ rows: [] }));
    const user = userEvent.setup();
    render(<OrganizationRolesPanel />);

    await user.click(screen.getByTestId('roles-sort'));
    await user.click(await screen.findByRole('option', { name: 'Name (Z–A)' }));

    await waitFor(() =>
      expect(useRolesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'name', order: 'desc' }),
      ),
    );
  });

  it('loads the next page when Load more is clicked', async () => {
    const fetchNextPage = vi.fn();
    useRolesMock.mockReturnValue(
      rolesQueryResult({ rows: [CUSTOM_ROLE], hasNextPage: true, fetchNextPage }),
    );
    const user = userEvent.setup();
    render(<OrganizationRolesPanel />);

    await user.click(screen.getByTestId('roles-load-more'));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});

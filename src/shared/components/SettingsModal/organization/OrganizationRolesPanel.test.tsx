import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { useRolesMock, deleteMutateAsync } = vi.hoisted(() => ({
  useRolesMock: vi.fn(),
  deleteMutateAsync: vi.fn(),
}));
vi.mock('@/shared/hooks/useRoles/index.ts', () => ({
  useRoles: useRolesMock,
  useDeleteRole: () => ({ mutateAsync: deleteMutateAsync }),
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

function setCanManage(value: boolean) {
  useOrganizationStore.setState({
    capabilities: {
      canInviteMembers: value,
      canManageMembers: value,
      canManageRoles: value,
      canTransferOwnership: value,
      canDelete: value,
      canManageBilling: value,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  deleteMutateAsync.mockResolvedValue({ id: 'rol_1' });
  useOrganizationStore.getState().clearOrganization();
});

describe('OrganizationRolesPanel', () => {
  it('shows an empty state when there are no roles', () => {
    useRolesMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<OrganizationRolesPanel />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('lists roles; only custom roles are deletable, and only with the capability', () => {
    useRolesMock.mockReturnValue({
      data: [CUSTOM_ROLE, SYSTEM_ROLE],
      isLoading: false,
      isError: false,
    });
    setCanManage(true);
    render(<OrganizationRolesPanel />);
    expect(screen.getByText('Billing Manager')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    // custom role deletable
    expect(screen.getByTestId('role-delete-rol_1')).toBeInTheDocument();
    // system role is not deletable
    expect(screen.queryByTestId('role-delete-rol_owner')).not.toBeInTheDocument();
  });

  it('hides delete controls without the manage-roles capability', () => {
    useRolesMock.mockReturnValue({
      data: [CUSTOM_ROLE],
      isLoading: false,
      isError: false,
    });
    setCanManage(false);
    render(<OrganizationRolesPanel />);
    expect(screen.queryByTestId('role-delete-rol_1')).not.toBeInTheDocument();
  });

  it('confirms and deletes a custom role', async () => {
    useRolesMock.mockReturnValue({
      data: [CUSTOM_ROLE],
      isLoading: false,
      isError: false,
    });
    setCanManage(true);
    const user = userEvent.setup();
    render(<OrganizationRolesPanel />);

    await user.click(screen.getByTestId('role-delete-rol_1'));
    await user.click(screen.getByTestId('confirm-accept'));

    await waitFor(() => expect(deleteMutateAsync).toHaveBeenCalledWith('rol_1'));
  });
});

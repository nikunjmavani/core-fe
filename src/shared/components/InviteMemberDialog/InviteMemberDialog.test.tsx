import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { RoleSummary } from '@/shared/api/organization-contracts.ts';

import { InviteMemberDialog } from './InviteMemberDialog.tsx';

const { inviteMutate, useRolesMock } = vi.hoisted(() => ({
  inviteMutate: vi.fn(),
  useRolesMock: vi.fn(),
}));
vi.mock('@/shared/hooks/useInvitations/index.ts', () => ({
  useInviteMember: () => ({ mutateAsync: inviteMutate, isPending: false }),
}));
vi.mock('@/shared/hooks/useRoles/index.ts', () => ({
  useRoles: useRolesMock,
}));

function role(id: string, name: string): RoleSummary {
  return {
    id,
    name,
    description: '',
    permissions: [],
    memberCount: 0,
    isSystem: name.toLowerCase() === 'owner',
  };
}

function rolesResult(rows: RoleSummary[], isPending = false) {
  return {
    rows,
    isPending,
    isError: false,
    isFetching: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
}

async function open() {
  const user = userEvent.setup();
  await user.click(screen.getByTestId('invite-member-open'));
  return user;
}

describe('InviteMemberDialog', () => {
  it('submits the email + selected role_id (the org has real roles)', async () => {
    // Regression: the form used to submit a hardcoded role NAME to a
    // non-existent /invitations endpoint. It must post a real role_id.
    useRolesMock.mockReturnValue(
      rolesResult([role('rol_owner', 'Owner'), role('rol_mem', 'Member')]),
    );
    inviteMutate.mockResolvedValueOnce({ email: 'new@x.test' });
    render(<InviteMemberDialog />);
    const user = await open();

    await screen.findByTestId('invite-member-form');
    await user.type(screen.getByTestId('invite-member-email'), 'new@x.test');
    await user.click(screen.getByTestId('invite-member-submit'));

    await waitFor(() =>
      expect(inviteMutate).toHaveBeenCalledWith({
        email: 'new@x.test',
        roleId: 'rol_mem',
      }),
    );
  });

  it('excludes the Owner role from the invite options', async () => {
    useRolesMock.mockReturnValue(
      rolesResult([role('rol_owner', 'Owner'), role('rol_mem', 'Member')]),
    );
    render(<InviteMemberDialog />);
    const user = await open();
    await user.click(await screen.findByTestId('invite-member-role'));

    expect(await screen.findByRole('option', { name: 'Member' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Owner' })).not.toBeInTheDocument();
  });

  it('guides the user to create a role when only Owner exists', async () => {
    useRolesMock.mockReturnValue(rolesResult([role('rol_owner', 'Owner')]));
    render(<InviteMemberDialog />);
    await open();

    expect(await screen.findByTestId('invite-member-no-roles')).toBeInTheDocument();
    expect(screen.queryByTestId('invite-member-form')).not.toBeInTheDocument();
  });

  it('shows a loading state while roles are fetching', async () => {
    useRolesMock.mockReturnValue(rolesResult([], true));
    render(<InviteMemberDialog />);
    await open();

    expect(await screen.findByTestId('invite-member-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('invite-member-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invite-member-no-roles')).not.toBeInTheDocument();
  });
});

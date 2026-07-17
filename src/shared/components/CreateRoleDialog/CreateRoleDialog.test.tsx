import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { axeForDialog } from '@/tests/utils/axe-for-dialog.ts';

import { CreateRoleDialog } from './CreateRoleDialog.tsx';

const { createRoleMutate } = vi.hoisted(() => ({ createRoleMutate: vi.fn() }));
vi.mock('@/shared/hooks/useRoles/index.ts', () => ({
  useCreateRole: () => ({ mutateAsync: createRoleMutate, isPending: false }),
}));

async function open() {
  const user = userEvent.setup();
  await user.click(screen.getByTestId('role-create-open'));
  await screen.findByTestId('role-create-form');
  return user;
}

describe('CreateRoleDialog', () => {
  it('opens a form with name, description, and a permission checklist', async () => {
    render(<CreateRoleDialog />);
    await open();
    expect(screen.getByTestId('role-create-name')).toBeInTheDocument();
    expect(screen.getByTestId('role-create-description')).toBeInTheDocument();
    expect(screen.getByTestId('role-perm-membership:manage')).toBeInTheDocument();
    expect(screen.getByTestId('role-perm-invitation:manage')).toBeInTheDocument();
  });

  it('blocks submit until at least one permission is selected', async () => {
    render(<CreateRoleDialog />);
    const user = await open();

    await user.type(screen.getByTestId('role-create-name'), 'Member');
    await user.type(screen.getByTestId('role-create-description'), 'Everyday access');
    await user.click(screen.getByTestId('role-create-submit'));

    expect(await screen.findByText(/at least one permission/i)).toBeInTheDocument();
    expect(createRoleMutate).not.toHaveBeenCalled();
  });

  it('creates a role with the chosen name, description, and permissions', async () => {
    createRoleMutate.mockResolvedValueOnce({ id: 'rol_x', name: 'Member' });
    render(<CreateRoleDialog />);
    const user = await open();

    await user.type(screen.getByTestId('role-create-name'), 'Member');
    await user.type(screen.getByTestId('role-create-description'), 'Everyday access');
    await user.click(screen.getByTestId('role-perm-membership:read'));
    await user.click(screen.getByTestId('role-create-submit'));

    await waitFor(() =>
      expect(createRoleMutate).toHaveBeenCalledWith({
        name: 'Member',
        description: 'Everyday access',
        permissions: ['membership:read'],
      }),
    );
  });

  it('has no accessibility violations', async () => {
    const { baseElement } = render(<CreateRoleDialog />);
    await open();
    expect(await axeForDialog(baseElement)).toHaveNoViolations();
  });
});

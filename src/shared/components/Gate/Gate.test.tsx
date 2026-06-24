import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AuthUser } from '@/shared/auth/types.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { Gate } from './Gate.tsx';

const USER = { id: 'usr_1', email: 'u@e.com', role: 'user' } as AuthUser;

function setCaps(value: boolean) {
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
  useAuthStore.setState({ user: USER });
  useOrganizationStore.getState().clearOrganization();
});

describe('Gate', () => {
  it('renders children when the check passes', () => {
    setCaps(true);
    render(
      <Gate capability="canManageMembers">
        <span>allowed</span>
      </Gate>,
    );
    expect(screen.getByText('allowed')).toBeInTheDocument();
  });

  it('renders the fallback when the check fails', () => {
    setCaps(false);
    render(
      <Gate capability="canManageMembers" fallback={<span>denied</span>}>
        <span>allowed</span>
      </Gate>,
    );
    expect(screen.queryByText('allowed')).not.toBeInTheDocument();
    expect(screen.getByText('denied')).toBeInTheDocument();
  });
});

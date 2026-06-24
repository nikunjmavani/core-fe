import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { useMembersMock, removeMutateAsync } = vi.hoisted(() => ({
  useMembersMock: vi.fn(),
  removeMutateAsync: vi.fn(),
}));
vi.mock('@/shared/hooks/useMembers/index.ts', () => ({
  useMembers: useMembersMock,
  useRemoveMember: () => ({ mutateAsync: removeMutateAsync }),
}));

import { OrganizationMembersPanel } from './OrganizationMembersPanel.tsx';

const MEMBER = {
  id: 'mem_1',
  userId: 'usr_1',
  name: 'Ada Byron',
  email: 'ada@acme.test',
  role: 'owner',
  status: 'active',
  joinedAt: '2026-01-01T00:00:00.000Z',
};

function setCanManage(value: boolean) {
  useAuthStore.setState({
    user: { id: 'u', email: 'a@b.test', role: 'user' },
    isAuthenticated: true,
  });
  useOrganizationStore.setState({
    organizationType: value ? 'TEAM' : 'PERSONAL',
    permissions: value ? ['membership:manage'] : [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  removeMutateAsync.mockResolvedValue({ id: 'mem_1' });
  useOrganizationStore.getState().clearOrganization();
});

describe('OrganizationMembersPanel', () => {
  it('shows an empty state when there are no members', () => {
    useMembersMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<OrganizationMembersPanel />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows a loading skeleton', () => {
    useMembersMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<OrganizationMembersPanel />);
    expect(screen.getByTestId('members-loading')).toBeInTheDocument();
  });

  it('lists members with a remove control when the org can manage members', () => {
    useMembersMock.mockReturnValue({ data: [MEMBER], isLoading: false, isError: false });
    setCanManage(true);
    render(<OrganizationMembersPanel />);
    expect(screen.getByText('Ada Byron')).toBeInTheDocument();
    expect(screen.getByText('ada@acme.test')).toBeInTheDocument();
    expect(screen.getByTestId('member-remove-mem_1')).toBeInTheDocument();
  });

  it('hides the remove control without the capability (e.g. a personal org)', () => {
    useMembersMock.mockReturnValue({ data: [MEMBER], isLoading: false, isError: false });
    setCanManage(false);
    render(<OrganizationMembersPanel />);
    expect(screen.getByText('Ada Byron')).toBeInTheDocument();
    expect(screen.queryByTestId('member-remove-mem_1')).not.toBeInTheDocument();
  });

  it('confirms and removes a member', async () => {
    useMembersMock.mockReturnValue({ data: [MEMBER], isLoading: false, isError: false });
    setCanManage(true);
    const user = userEvent.setup();
    render(<OrganizationMembersPanel />);

    await user.click(screen.getByTestId('member-remove-mem_1'));
    await user.click(screen.getByTestId('confirm-accept'));

    await waitFor(() => expect(removeMutateAsync).toHaveBeenCalledWith('mem_1'));
  });
});

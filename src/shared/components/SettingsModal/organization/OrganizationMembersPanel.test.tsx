import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { useMembersMock, removeMutate } = vi.hoisted(() => ({
  useMembersMock: vi.fn(),
  removeMutate: vi.fn(),
}));
vi.mock('@/shared/hooks/useMembers/index.ts', () => ({
  useMembers: useMembersMock,
  useRemoveMember: () => ({ mutate: removeMutate }),
}));
vi.mock('@/shared/notify/notify-deferred.ts', () => ({
  notifyDeferredCommit: ({ onCommit }: { onCommit: () => void }) => onCommit(),
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

function membersQueryResult(
  overrides: { rows?: (typeof MEMBER)[] } & Record<string, unknown>,
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
    permissions: value ? ['membership:manage'] : [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useOrganizationStore.getState().clearOrganization();
});

describe('OrganizationMembersPanel', () => {
  it('shows an empty state when there are no members', () => {
    useMembersMock.mockReturnValue(membersQueryResult({ rows: [] }));
    render(<OrganizationMembersPanel />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows a loading skeleton', () => {
    useMembersMock.mockReturnValue(membersQueryResult({ rows: [], isPending: true }));
    render(<OrganizationMembersPanel />);
    expect(screen.getByTestId('members-loading')).toBeInTheDocument();
  });

  it('lists members with a remove control when the org can manage members', () => {
    useMembersMock.mockReturnValue(membersQueryResult({ rows: [MEMBER] }));
    setCanManage(true);
    render(<OrganizationMembersPanel />);
    expect(screen.getByText('Ada Byron')).toBeInTheDocument();
    expect(screen.getByText('ada@acme.test')).toBeInTheDocument();
    expect(screen.getByTestId('member-remove-mem_1')).toBeInTheDocument();
  });

  it('hides the remove control without the capability (e.g. a personal org)', () => {
    useMembersMock.mockReturnValue(membersQueryResult({ rows: [MEMBER] }));
    setCanManage(false);
    render(<OrganizationMembersPanel />);
    expect(screen.getByText('Ada Byron')).toBeInTheDocument();
    expect(screen.queryByTestId('member-remove-mem_1')).not.toBeInTheDocument();
  });

  it('confirms and removes a member', async () => {
    useMembersMock.mockReturnValue(membersQueryResult({ rows: [MEMBER] }));
    setCanManage(true);
    const user = userEvent.setup();
    render(<OrganizationMembersPanel />);

    await user.click(screen.getByTestId('member-remove-mem_1'));
    await user.click(screen.getByTestId('confirm-accept'));

    await waitFor(() => expect(removeMutate).toHaveBeenCalledWith('mem_1'));
  });

  it('renders a search box and forwards the debounced term to the hook', async () => {
    useMembersMock.mockReturnValue(membersQueryResult({ rows: [] }));
    const user = userEvent.setup();
    render(<OrganizationMembersPanel />);

    await user.type(screen.getByTestId('members-search'), 'ada');
    await waitFor(() =>
      expect(useMembersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'ada', sort: 'name', order: 'asc' }),
      ),
    );
  });

  it('forwards the selected sort preset to the hook', async () => {
    useMembersMock.mockReturnValue(membersQueryResult({ rows: [] }));
    const user = userEvent.setup();
    render(<OrganizationMembersPanel />);

    await user.click(screen.getByTestId('members-sort'));
    await user.click(await screen.findByRole('option', { name: 'Newest first' }));

    await waitFor(() =>
      expect(useMembersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'created_at', order: 'desc' }),
      ),
    );
  });

  it('loads the next page when Load more is clicked', async () => {
    const fetchNextPage = vi.fn();
    useMembersMock.mockReturnValue(
      membersQueryResult({ rows: [MEMBER], hasNextPage: true, fetchNextPage }),
    );
    const user = userEvent.setup();
    render(<OrganizationMembersPanel />);

    await user.click(screen.getByTestId('members-load-more'));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});

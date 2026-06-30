import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { listMembers, updateMemberRole, removeMember, updateMemberStatus } = vi.hoisted(
  () => ({
    listMembers: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    updateMemberStatus: vi.fn(),
  }),
);
vi.mock('@/shared/api/organization-api.ts', () => ({
  listMembers,
  updateMemberRole,
  removeMember,
  updateMemberStatus,
}));

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/shared/notify/index.ts', () => ({
  notify: { success: notifySuccess, error: notifyError },
}));

import {
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
  useUpdateMemberStatus,
} from './useMembers.ts';

type Row = { id: string; role?: string; status?: string };

const ORG = 'org_aaaaaaaaaaaaaaaaaaaaa';
const KEY = orgQueryKeys.members(ORG);
const ids = (rows: Row[] | undefined) => rows?.map((r) => r.id);

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: {
      // gcTime: Infinity — the mutation hooks have no observer for the members
      // key, so a 0 gcTime would garbage-collect the seeded cache before
      // onMutate can read/patch it.
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  useOrganizationStore.setState({ organizationId: ORG });
});

afterEach(() => {
  useOrganizationStore.getState().clearOrganization();
});

describe('useMembers', () => {
  it('loads listMembers data under the organization query key', async () => {
    listMembers.mockResolvedValue([{ id: 'm_1', name: 'Ada' }]);
    const { result } = renderHook(() => useMembers(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'm_1', name: 'Ada' }]);
  });
});

describe('useUpdateMemberRole', () => {
  it('optimistically patches the role and keeps it on success', async () => {
    client.setQueryData<Row[]>(KEY, [
      { id: 'm_1', role: 'member' },
      { id: 'm_2', role: 'member' },
    ]);
    updateMemberRole.mockResolvedValue({ id: 'm_1', role: 'admin' });
    const { result } = renderHook(() => useUpdateMemberRole(), { wrapper });

    result.current.mutate({ membershipId: 'm_1', role: 'admin' });

    // onMutate patches the cache before the request resolves.
    await waitFor(() =>
      expect(client.getQueryData<Row[]>(KEY)?.find((m) => m.id === 'm_1')?.role).toBe(
        'admin',
      ),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The other member is untouched; success toasts.
    expect(client.getQueryData<Row[]>(KEY)?.find((m) => m.id === 'm_2')?.role).toBe(
      'member',
    );
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('rolls back the role when the request fails', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'm_1', role: 'member' }]);
    updateMemberRole.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useUpdateMemberRole(), { wrapper });

    result.current.mutate({ membershipId: 'm_1', role: 'admin' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<Row[]>(KEY)?.[0]?.role).toBe('member');
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('useRemoveMember', () => {
  it('optimistically drops the row and toasts on success', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'm_1' }, { id: 'm_2' }]);
    removeMember.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRemoveMember(), { wrapper });

    result.current.mutate('m_1');

    await waitFor(() => expect(ids(client.getQueryData<Row[]>(KEY))).toEqual(['m_2']));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('restores the removed row when the request fails', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'm_1' }, { id: 'm_2' }]);
    removeMember.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useRemoveMember(), { wrapper });

    result.current.mutate('m_1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(ids(client.getQueryData<Row[]>(KEY))).toEqual(['m_1', 'm_2']);
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});

describe('useUpdateMemberStatus', () => {
  it('optimistically flips the status badge (suspend)', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'm_1', status: 'active' }]);
    updateMemberStatus.mockResolvedValue({ id: 'm_1', status: 'suspended' });
    const { result } = renderHook(() => useUpdateMemberStatus(), { wrapper });

    result.current.mutate({ membershipId: 'm_1', status: 'suspended' });

    await waitFor(() =>
      expect(client.getQueryData<Row[]>(KEY)?.[0]?.status).toBe('suspended'),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back the status when the request fails', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'm_1', status: 'active' }]);
    updateMemberStatus.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useUpdateMemberStatus(), { wrapper });

    result.current.mutate({ membershipId: 'm_1', status: 'suspended' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<Row[]>(KEY)?.[0]?.status).toBe('active');
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});

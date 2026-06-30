import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { listInvitations, createInvitation, revokeInvitation, resendInvitation } =
  vi.hoisted(() => ({
    listInvitations: vi.fn(),
    createInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
    resendInvitation: vi.fn(),
  }));
vi.mock('@/shared/api/organization-api.ts', () => ({
  listInvitations,
  createInvitation,
  revokeInvitation,
  resendInvitation,
}));
const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/shared/notify/index.ts', () => ({
  notify: { success: notifySuccess, error: notifyError },
}));

import { useInvitations, useRevokeInvitation } from './useInvitations.ts';

type Row = { id: string; email?: string };

const ORG = 'org_aaaaaaaaaaaaaaaaaaaaa';
const KEY = orgQueryKeys.invitations(ORG);
const ids = (rows: Row[] | undefined) => rows?.map((r) => r.id);

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  useOrganizationStore.setState({ organizationId: ORG });
});

afterEach(() => {
  useOrganizationStore.getState().clearOrganization();
});

describe('useInvitations', () => {
  it('loads listInvitations data under the organization query key', async () => {
    listInvitations.mockResolvedValue([{ id: 'inv_1', email: 'a@b.c' }]);
    const { result } = renderHook(() => useInvitations(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'inv_1', email: 'a@b.c' }]);
  });
});

describe('useRevokeInvitation', () => {
  it('optimistically drops the invitation and toasts on success', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'inv_1' }, { id: 'inv_2' }]);
    revokeInvitation.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRevokeInvitation(), { wrapper });

    result.current.mutate('inv_1');

    await waitFor(() => expect(ids(client.getQueryData<Row[]>(KEY))).toEqual(['inv_2']));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('restores the invitation on error', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'inv_1' }, { id: 'inv_2' }]);
    revokeInvitation.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useRevokeInvitation(), { wrapper });

    result.current.mutate('inv_1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(ids(client.getQueryData<Row[]>(KEY))).toEqual(['inv_1', 'inv_2']);
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});

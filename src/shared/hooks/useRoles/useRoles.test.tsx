import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { listRoles, createRole, updateRole, deleteRole } = vi.hoisted(() => ({
  listRoles: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
}));
vi.mock('@/shared/api/organization-api.ts', () => ({
  listRoles,
  createRole,
  updateRole,
  deleteRole,
}));
const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/shared/notify/index.ts', () => ({
  notify: { success: notifySuccess, error: notifyError },
}));

import { useDeleteRole, useRoles, useUpdateRole } from './useRoles.ts';

type Row = { id: string; name?: string };

const ORG = 'org_aaaaaaaaaaaaaaaaaaaaa';
const KEY = orgQueryKeys.roles(ORG);
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

describe('useRoles', () => {
  it('loads listRoles data under the organization query key', async () => {
    listRoles.mockResolvedValue([{ id: 'role_1', name: 'Admin' }]);
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'role_1', name: 'Admin' }]);
  });
});

describe('useUpdateRole', () => {
  it('optimistically renames the role and keeps it on success', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'role_1', name: 'Old' }]);
    updateRole.mockResolvedValue({ id: 'role_1', name: 'New' });
    const { result } = renderHook(() => useUpdateRole(), { wrapper });

    result.current.mutate({ id: 'role_1', name: 'New' });

    await waitFor(() => expect(client.getQueryData<Row[]>(KEY)?.[0]?.name).toBe('New'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('rolls back the rename on error', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'role_1', name: 'Old' }]);
    updateRole.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useUpdateRole(), { wrapper });

    result.current.mutate({ id: 'role_1', name: 'New' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<Row[]>(KEY)?.[0]?.name).toBe('Old');
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});

describe('useDeleteRole', () => {
  it('optimistically drops the role and restores it on error', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'role_1' }, { id: 'role_2' }]);
    deleteRole.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useDeleteRole(), { wrapper });

    result.current.mutate('role_1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(ids(client.getQueryData<Row[]>(KEY))).toEqual(['role_1', 'role_2']);
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { listApiKeys, createApiKey, renameApiKey, revokeApiKey } = vi.hoisted(() => ({
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  renameApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));
vi.mock('@/shared/api/organization-api.ts', () => ({
  listApiKeys,
  createApiKey,
  renameApiKey,
  revokeApiKey,
}));
const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/shared/notify/index.ts', () => ({
  notify: { success: notifySuccess, error: notifyError },
}));

import { useApiKeys, useRenameApiKey, useRevokeApiKey } from './useApiKeys.ts';

type Row = { id: string; name?: string };

const ORG = 'org_aaaaaaaaaaaaaaaaaaaaa';
const KEY = orgQueryKeys.apiKeys(ORG);
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

describe('useApiKeys', () => {
  it('loads listApiKeys data under the organization query key', async () => {
    listApiKeys.mockResolvedValue([{ id: 'key_1', name: 'CI' }]);
    const { result } = renderHook(() => useApiKeys(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'key_1', name: 'CI' }]);
  });
});

describe('useRenameApiKey', () => {
  it('optimistically renames the key and rolls back on error', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'key_1', name: 'Old' }]);
    renameApiKey.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRenameApiKey(), { wrapper });

    result.current.mutate({ id: 'key_1', name: 'New' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<Row[]>(KEY)?.[0]?.name).toBe('Old');
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});

describe('useRevokeApiKey', () => {
  it('optimistically drops the key and toasts on success', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'key_1' }, { id: 'key_2' }]);
    revokeApiKey.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRevokeApiKey(), { wrapper });

    result.current.mutate('key_1');

    await waitFor(() => expect(ids(client.getQueryData<Row[]>(KEY))).toEqual(['key_2']));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('restores the key on error', async () => {
    client.setQueryData<Row[]>(KEY, [{ id: 'key_1' }, { id: 'key_2' }]);
    revokeApiKey.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useRevokeApiKey(), { wrapper });

    result.current.mutate('key_1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(ids(client.getQueryData<Row[]>(KEY))).toEqual(['key_1', 'key_2']);
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});

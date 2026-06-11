import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '@/core/data-provider/dataProvider.ts';

vi.mock('@/core/data-provider/index.ts', () => ({
  dataProvider: {
    getList: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } satisfies DataProvider,
}));

const { dataProvider } = await import('@/core/data-provider/index.ts');
const { useCreate } = await import('./useCreate.ts');

function makeContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe('useCreate', () => {
  beforeEach(() => {
    vi.mocked(dataProvider.create).mockReset();
  });

  it('calls dataProvider.create with the resource and data', async () => {
    vi.mocked(dataProvider.create).mockResolvedValue({ id: 'u1', name: 'Alice' });
    const { wrapper } = makeContext();
    const { result } = renderHook(() => useCreate('users'), { wrapper });

    result.current.mutate({ name: 'Alice' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(dataProvider.create).toHaveBeenCalledWith('users', { name: 'Alice' });
  });

  it('invalidates the resource queries on success', async () => {
    vi.mocked(dataProvider.create).mockResolvedValue({ id: 'u1' });
    const { queryClient, wrapper } = makeContext();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreate('users'), { wrapper });
    result.current.mutate({ name: 'Alice' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith({ queryKey: ['resource', 'users'] });
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { successMock, errorMock } = vi.hoisted(() => ({
  successMock: vi.fn(),
  errorMock: vi.fn(),
}));
vi.mock('@/shared/notify/index.ts', () => ({
  notify: {
    success: successMock,
    error: errorMock,
    info: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { useAppMutation } from './useAppMutation.ts';

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useAppMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates keys, toasts success, and runs onSuccess', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn: async (n: number) => n + 1,
          invalidateKeys: [['members']],
          successMessage: 'Saved',
          onSuccess,
        }),
      { wrapper: makeWrapper(client) },
    );

    await result.current.mutateAsync(1);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['members'] });
    expect(successMock).toHaveBeenCalledWith('Saved');
    expect(onSuccess).toHaveBeenCalledWith(2, 1);
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('toasts the mapped error on failure', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn: async () => {
            throw new Error('boom');
          },
        }),
      { wrapper: makeWrapper(client) },
    );

    await expect(result.current.mutateAsync()).rejects.toThrow('boom');
    expect(errorMock).toHaveBeenCalledWith('boom');
  });

  it('skips the error toast when notifyOnError is false', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn: async () => {
            throw new Error('silent');
          },
          notifyOnError: false,
        }),
      { wrapper: makeWrapper(client) },
    );

    await expect(result.current.mutateAsync()).rejects.toThrow('silent');
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('optimistically patches the cache and keeps the patch after success', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const key = ['items'];
    client.setQueryData(key, [{ id: 'a' }, { id: 'b' }]);
    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn: async (id: string) => id,
          invalidateKeys: [key],
          optimistic: {
            queryKey: key,
            update: (previous: { id: string }[] | undefined, id) =>
              previous?.filter((item) => item.id !== id),
          },
        }),
      { wrapper: makeWrapper(client) },
    );

    await result.current.mutateAsync('a');

    expect(client.getQueryData(key)).toEqual([{ id: 'b' }]);
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('rolls back the optimistic patch on error', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const key = ['items'];
    const initial = [{ id: 'a' }, { id: 'b' }];
    client.setQueryData(key, initial);
    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn: async () => {
            throw new Error('nope');
          },
          optimistic: {
            queryKey: key,
            update: (previous: { id: string }[] | undefined, id: string) =>
              previous?.filter((item) => item.id !== id),
          },
        }),
      { wrapper: makeWrapper(client) },
    );

    await expect(result.current.mutateAsync('a')).rejects.toThrow('nope');

    expect(client.getQueryData(key)).toEqual(initial);
    expect(errorMock).toHaveBeenCalledWith('nope');
  });
});

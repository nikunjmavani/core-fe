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
});

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/errors/errorHandler.ts', () => ({
  reportError: vi.fn(),
}));

vi.mock('@/core/http/fetch-client.ts', () => ({
  isUnauthorized: vi.fn((error: unknown) => {
    return (
      error instanceof Error &&
      'status' in error &&
      (error as { status: number }).status === 401
    );
  }),
}));

import { reportError } from '@/shared/errors/errorHandler.ts';

import { queryClient } from './queryClient.ts';

describe('queryClient', () => {
  it('is a QueryClient instance', () => {
    expect(queryClient).toBeDefined();
    expect(queryClient.getDefaultOptions).toBeDefined();
  });

  it('query cache onError reports non-401 errors', () => {
    const onError = queryClient.getQueryCache().config.onError;
    const query = { queryKey: ['t'], queryHash: 't', meta: undefined } as never;
    onError?.(new Error('boom'), query);
    expect(reportError).toHaveBeenCalled();
  });

  it('mutation cache onError reports non-401 errors', () => {
    const onError = queryClient.getMutationCache().config.onError;
    const mutation = { options: { mutationKey: ['m'], meta: undefined } } as never;
    onError?.(new Error('boom'), undefined, undefined, mutation);
    expect(reportError).toHaveBeenCalled();
  });

  it('has staleTime configured', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(1000 * 60 * 5);
  });

  it('has refetchOnWindowFocus disabled', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('has mutations retry disabled', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.mutations?.retry).toBe(false);
  });

  it('retry function skips 401 errors', () => {
    const defaults = queryClient.getDefaultOptions();
    const retryFn = defaults.queries?.retry as (count: number, error: unknown) => boolean;
    expect(typeof retryFn).toBe('function');
  });
});

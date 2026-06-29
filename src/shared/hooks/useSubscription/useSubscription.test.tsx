import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSubscription } from './useSubscription.ts';

const DATA = { id: 'sub_test', planId: 'pln_test', status: 'active' as const };

vi.mock('@/shared/api/billing-api.ts', () => ({
  getActiveSubscription: vi.fn().mockImplementation(() => Promise.resolve(DATA)),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSubscription', () => {
  it('loads getActiveSubscription data under the billing query key', async () => {
    const { result } = renderHook(() => useSubscription(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(DATA);
  });
});

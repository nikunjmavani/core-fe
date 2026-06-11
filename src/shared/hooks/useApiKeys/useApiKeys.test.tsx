import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useApiKeys } from './useApiKeys.ts';

const DATA = [{ id: 'key_1', name: 'CI' }];

vi.mock('@/shared/api/organization-api.ts', () => ({
  listApiKeys: vi.fn().mockImplementation(() => Promise.resolve(DATA)),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useApiKeys', () => {
  it('loads listApiKeys data under the organization query key', async () => {
    const { result } = renderHook(() => useApiKeys(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(DATA);
  });
});

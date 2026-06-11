import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useInvitations } from './useInvitations.ts';

const DATA = [{ id: 'inv_1', email: 'a@b.c' }];

vi.mock('@/shared/api/organization-api.ts', () => ({
  listInvitations: vi.fn().mockImplementation(() => Promise.resolve(DATA)),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useInvitations', () => {
  it('loads listInvitations data under the organization query key', async () => {
    const { result } = renderHook(() => useInvitations(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(DATA);
  });
});

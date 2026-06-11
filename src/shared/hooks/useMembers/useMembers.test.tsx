import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useMembers } from './useMembers.ts';

const DATA = [{ id: 'm_1', name: 'Ada' }];

vi.mock('@/shared/api/organization-api.ts', () => ({
  listMembers: vi.fn().mockImplementation(() => Promise.resolve(DATA)),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMembers', () => {
  it('loads listMembers data under the organization query key', async () => {
    const { result } = renderHook(() => useMembers(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(DATA);
  });
});

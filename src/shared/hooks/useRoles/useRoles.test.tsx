import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useRoles } from './useRoles.ts';

const DATA = [{ id: 'role_1', name: 'Admin' }];

vi.mock('@/shared/api/organization-api.ts', () => ({
  listRoles: vi.fn().mockImplementation(() => Promise.resolve(DATA)),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRoles', () => {
  it('loads listRoles data under the organization query key', async () => {
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(DATA);
  });
});

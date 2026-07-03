import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ListPage } from '@/shared/api/fetch-list-page.ts';

import { useCursorList } from './useCursorList.ts';

type Row = { id: string };

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

describe('useCursorList', () => {
  it('flattens the first page into rows and reflects hasNextPage', async () => {
    const queryFn = vi
      .fn<(after: string | undefined) => Promise<ListPage<Row>>>()
      .mockResolvedValue({
        rows: [{ id: 'a' }, { id: 'b' }],
        next: 'cur_1',
        hasMore: true,
      });

    const { result } = renderHook(
      () => useCursorList<Row>({ queryKey: ['list', 'a'], queryFn }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.rows).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(result.current.hasNextPage).toBe(true);
    expect(queryFn).toHaveBeenCalledWith(undefined);
  });

  it('accumulates rows and passes the forward cursor as `after` on fetchNextPage', async () => {
    const queryFn = vi
      .fn<(after: string | undefined) => Promise<ListPage<Row>>>()
      .mockResolvedValueOnce({ rows: [{ id: 'a' }], next: 'cur_1', hasMore: true })
      .mockResolvedValueOnce({ rows: [{ id: 'b' }], next: null, hasMore: false });

    const { result } = renderHook(
      () => useCursorList<Row>({ queryKey: ['list', 'b'], queryFn }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.rows).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(result.current.hasNextPage).toBe(false);
    expect(queryFn).toHaveBeenNthCalledWith(2, 'cur_1');
  });

  it('does not fetch when disabled', () => {
    const queryFn = vi
      .fn<(after: string | undefined) => Promise<ListPage<Row>>>()
      .mockResolvedValue({ rows: [], next: null, hasMore: false });

    renderHook(
      () => useCursorList<Row>({ queryKey: ['list', 'c'], queryFn, enabled: false }),
      { wrapper },
    );

    expect(queryFn).not.toHaveBeenCalled();
  });
});

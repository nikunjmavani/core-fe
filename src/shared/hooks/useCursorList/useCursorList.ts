import { type QueryKey, useInfiniteQuery } from '@tanstack/react-query';

import type { ListPage } from '@/shared/api/fetch-list-page.ts';

/**
 * Normalized result of a cursor-paginated list: the accumulated rows plus a
 * flat control surface. Hides `useInfiniteQuery`'s `data.pages` shape from
 * consumers so panels (and their tests) stay declarative.
 */
export interface CursorListResult<T> {
  /** All rows fetched so far, flattened across pages. */
  rows: T[];
  isPending: boolean;
  isError: boolean;
  /** Any fetch in flight (initial load, refetch, or next page). */
  isFetching: boolean;
  /** Whether another page can be loaded. */
  hasNextPage: boolean;
  /** A `Load more` fetch is in flight. */
  isFetchingNextPage: boolean;
  /** Load the next keyset page (no-op when there is none). */
  fetchNextPage: () => void;
  /** Refetch from the first page (used by the error retry surface). */
  refetch: () => void;
}

/**
 * Wraps `useInfiniteQuery` for a core-be keyset list: seeds `after` from the
 * previous page's forward cursor and exposes a {@link CursorListResult}. Keyset
 * pagination is forward-only, so this surfaces `fetchNextPage`/`hasNextPage`
 * (a `Load more` affordance) rather than jump-to-page controls.
 */
export function useCursorList<T>(args: {
  queryKey: QueryKey;
  queryFn: (after: string | undefined) => Promise<ListPage<T>>;
  enabled?: boolean;
}): CursorListResult<T> {
  const query = useInfiniteQuery({
    queryKey: args.queryKey,
    queryFn: ({ pageParam }) => args.queryFn(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? (last.next ?? undefined) : undefined),
    ...(args.enabled !== undefined ? { enabled: args.enabled } : {}),
  });

  return {
    rows: query.data?.pages.flatMap((page) => page.rows) ?? [],
    isPending: query.isPending,
    isError: query.isError,
    isFetching: query.isFetching,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      query.fetchNextPage().catch(() => {
        // Errors surface through the query's own isError state; nothing to do.
      });
    },
    refetch: () => {
      query.refetch().catch(() => {
        // Errors surface through the query's own isError state; nothing to do.
      });
    },
  };
}

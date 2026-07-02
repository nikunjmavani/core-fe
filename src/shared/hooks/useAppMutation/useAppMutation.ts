import {
  type InfiniteData,
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { mapApiError } from '@/shared/errors/errorHandler.ts';
import { notify } from '@/shared/notify/index.ts';

/**
 * Opt-in optimistic update: patch a cached list before the request resolves so
 * the UI reacts instantly, snapshot it for rollback on error, and let
 * `invalidateKeys` reconcile with server truth on success.
 */
export interface OptimisticConfig<TVars, TCache> {
  /** List query key whose cached value is patched optimistically. */
  queryKey: QueryKey;
  /** Compute the next cached value from the previous snapshot and the vars. */
  update: (previous: TCache | undefined, vars: TVars) => TCache | undefined;
}

/**
 * Optimistic update for a cursor-paginated `useInfiniteQuery` list. Because the
 * data lives under a param-scoped key (per search/sort), `queryKey` is a PREFIX
 * that matches every cached variant; `update` patches one accumulated page's
 * rows and is applied to every page of every match. Snapshots all matches for
 * rollback.
 */
export interface OptimisticInfiniteConfig<TVars, TRow> {
  /** Prefix key matching every cached param-variant of the infinite list. */
  queryKey: QueryKey;
  /** Patch one page's rows (applied to every page of every matched query). */
  update: (rows: TRow[], vars: TVars) => TRow[];
}

export interface AppMutationOptions<TData, TVars, TCache = unknown, TRow = unknown> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Query keys to invalidate after a successful mutation. */
  invalidateKeys?: QueryKey[];
  /** Success toast — a string or a fn of (data, vars). Omit for no toast. */
  successMessage?: string | ((data: TData, vars: TVars) => string);
  /** Toast the mapped error on failure (default: true). */
  notifyOnError?: boolean;
  /** Extra success side effect (e.g. close a dialog). Runs after invalidation. */
  onSuccess?: (data: TData, vars: TVars) => void | Promise<void>;
  /** Optimistically patch a cached list; rolled back automatically on error. */
  optimistic?: OptimisticConfig<TVars, TCache>;
  /** Optimistically patch a cursor-paginated infinite list (prefix-matched). */
  optimisticInfinite?: OptimisticInfiniteConfig<TVars, TRow>;
}

/** Minimal structural shape of one accumulated infinite-list page. */
type InfiniteListPage<TRow> = { rows: TRow[] };

/** Rollback snapshot carried from `onMutate` to `onError`. */
type OptimisticContext =
  | { kind: 'single'; previous: unknown }
  | { kind: 'infinite'; snapshots: [QueryKey, unknown][] };

/**
 * The standard write mutation. Runs `mutationFn` (the fetch client auto-attaches
 * the `Idempotency-Key` on writes), invalidates the given query keys, and
 * surfaces a success / error toast through the single `notify` surface — so
 * every Phase 6–7 mutation behaves identically. Returns the TanStack mutation,
 * so callers still get `mutate` / `mutateAsync` / `isPending`.
 */
export function useAppMutation<
  TData = unknown,
  TVars = void,
  TCache = unknown,
  TRow = unknown,
>(options: AppMutationOptions<TData, TVars, TCache, TRow>) {
  const queryClient = useQueryClient();
  const { optimistic, optimisticInfinite } = options;
  return useMutation<TData, Error, TVars, OptimisticContext | undefined>({
    mutationFn: options.mutationFn,
    onMutate: async (vars) => {
      if (optimisticInfinite) {
        // Cancel in-flight refetches so they can't clobber the optimistic patch.
        await queryClient.cancelQueries({ queryKey: optimisticInfinite.queryKey });
        const snapshots = queryClient.getQueriesData({
          queryKey: optimisticInfinite.queryKey,
        });
        queryClient.setQueriesData<InfiniteData<InfiniteListPage<TRow>>>(
          { queryKey: optimisticInfinite.queryKey },
          (old) =>
            old && Array.isArray(old.pages)
              ? {
                  ...old,
                  pages: old.pages.map((page) => ({
                    ...page,
                    rows: optimisticInfinite.update(page.rows, vars),
                  })),
                }
              : old,
        );
        return { kind: 'infinite', snapshots };
      }
      if (optimistic) {
        await queryClient.cancelQueries({ queryKey: optimistic.queryKey });
        const previous = queryClient.getQueryData(optimistic.queryKey);
        queryClient.setQueryData<TCache>(optimistic.queryKey, (old) =>
          optimistic.update(old, vars),
        );
        return { kind: 'single', previous };
      }
      return undefined;
    },
    onSuccess: async (data, vars) => {
      if (options.invalidateKeys?.length) {
        await Promise.all(
          options.invalidateKeys.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          ),
        );
      }
      if (options.successMessage !== undefined) {
        notify.success(
          typeof options.successMessage === 'function'
            ? options.successMessage(data, vars)
            : options.successMessage,
        );
      }
      await options.onSuccess?.(data, vars);
    },
    onError: (error, _vars, context) => {
      // Restore the pre-mutation snapshot(s) before surfacing the error.
      if (context?.kind === 'infinite') {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      } else if (context?.kind === 'single' && optimistic) {
        queryClient.setQueryData(optimistic.queryKey, context.previous);
      }
      if (options.notifyOnError !== false) notify.error(mapApiError(error));
    },
  });
}

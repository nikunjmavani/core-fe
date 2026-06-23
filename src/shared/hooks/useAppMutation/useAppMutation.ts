import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';

import { mapApiError } from '@/shared/errors/errorHandler.ts';
import { notify } from '@/shared/notify/index.ts';

export interface AppMutationOptions<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Query keys to invalidate after a successful mutation. */
  invalidateKeys?: QueryKey[];
  /** Success toast — a string or a fn of (data, vars). Omit for no toast. */
  successMessage?: string | ((data: TData, vars: TVars) => string);
  /** Toast the mapped error on failure (default: true). */
  notifyOnError?: boolean;
  /** Extra success side effect (e.g. close a dialog). Runs after invalidation. */
  onSuccess?: (data: TData, vars: TVars) => void | Promise<void>;
}

/**
 * The standard write mutation. Runs `mutationFn` (the fetch client auto-attaches
 * the `Idempotency-Key` on writes), invalidates the given query keys, and
 * surfaces a success / error toast through the single `notify` surface — so
 * every Phase 6–7 mutation behaves identically. Returns the TanStack mutation,
 * so callers still get `mutate` / `mutateAsync` / `isPending`.
 */
export function useAppMutation<TData = unknown, TVars = void>(
  options: AppMutationOptions<TData, TVars>,
) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVars>({
    mutationFn: options.mutationFn,
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
    onError: (error) => {
      if (options.notifyOnError !== false) notify.error(mapApiError(error));
    },
  });
}

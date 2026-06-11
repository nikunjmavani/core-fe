import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { HTTP } from '@/core/config/constants.ts';
import { isUnauthorized } from '@/core/http/fetch-client.ts';
import { reportError } from '@/shared/errors/errorHandler.ts';

/**
 * TanStack Query client.
 *
 * IMPORTANT: 401 refresh logic lives ONLY in the fetch client (fetch-client.ts).
 * The QueryCache/MutationCache onError callbacks handle non-auth errors
 * (logging, toasts, Sentry reporting) to avoid a race condition with the client.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: HTTP.STALE_TIME,
      retry: (failureCount, error) => {
        // Don't retry 401s — handled by fetch client
        if (isUnauthorized(error)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only handle non-auth errors here — fetch client owns 401s
      if (!isUnauthorized(error)) {
        if (import.meta.env.DEV) {
          console.error(`[Query Error] ${query.queryKey.toString()}:`, error.message);
        }
        reportError(error, { queryKey: query.queryKey.toString() });
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!isUnauthorized(error)) {
        const key = mutation.options.mutationKey?.toString() ?? 'unknown';
        if (import.meta.env.DEV) {
          console.error(`[Mutation Error] ${key}:`, error.message);
        }
        reportError(error, { mutationKey: key });
      }
    },
  }),
});

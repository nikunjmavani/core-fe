import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { RetryError } from '@/shared/components/RetryError/index.ts';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  /** Render the data once loaded. */
  children: (data: T) => ReactNode;
  /** Error message shown on failure. */
  errorMessage?: string;
  /** Optional custom loading element. */
  loading?: ReactNode;
}

function DefaultSkeleton() {
  return (
    <div className="space-y-3" data-testid="query-skeleton">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/**
 * Renders TanStack Query state: a skeleton while loading, a retry fallback on
 * error, or the data via render-prop. Centralizes the loading/error/data branch
 * so pages stay declarative.
 */
export function QueryBoundary<T>({
  query,
  children,
  errorMessage = 'Could not load data.',
  loading,
}: QueryBoundaryProps<T>) {
  if (query.isPending) return <>{loading ?? <DefaultSkeleton />}</>;
  if (query.isError) {
    return (
      <RetryError
        message={errorMessage}
        onRetry={() => {
          query.refetch().catch(() => undefined);
        }}
        isRetrying={query.isFetching}
      />
    );
  }
  return <>{children(query.data)}</>;
}

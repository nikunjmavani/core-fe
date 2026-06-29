import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
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
  errorMessage,
  loading,
}: QueryBoundaryProps<T>) {
  const { t } = useTranslation(ERRORS_NS);
  const resolvedErrorMessage = errorMessage ?? t(ERRORS_KEYS.frontend.query.loadFailed);
  if (query.isPending) return <>{loading ?? <DefaultSkeleton />}</>;
  if (query.isError) {
    return (
      <RetryError
        message={resolvedErrorMessage}
        onRetry={() => {
          query.refetch().catch(() => undefined);
        }}
        isRetrying={query.isFetching}
      />
    );
  }
  return <>{children(query.data)}</>;
}

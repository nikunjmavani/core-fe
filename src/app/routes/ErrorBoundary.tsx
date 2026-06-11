import { Link } from '@tanstack/react-router';
import { useEffect } from 'react';

import { reportError } from '@/shared/errors/errorHandler.ts';

/** Error-like with optional status (e.g. from TanStack Router or Response). */
function hasStatus(e: unknown): e is { status: number; statusText?: string } {
  return (
    typeof e === 'object' &&
    e !== null &&
    'status' in e &&
    typeof (e as { status: unknown }).status === 'number'
  );
}

/**
 * Top-level error boundary for TanStack Router.
 * Receives error from route errorComponent. Reports non-404 errors to Sentry.
 */
export function ErrorBoundary({ error }: { error?: unknown }) {
  const err = error;

  useEffect(() => {
    if (err != null && (!hasStatus(err) || (hasStatus(err) && err.status !== 404))) {
      reportError(err);
    }
  }, [err]);

  if (err != null && hasStatus(err)) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
        data-testid="route-error-boundary"
      >
        <h1 className="text-foreground text-4xl font-bold">{err.status}</h1>
        <p className="text-muted-foreground text-lg">
          {err.status === 404
            ? 'The page you are looking for does not exist.'
            : (err.statusText ?? 'Something went wrong.')}
        </p>
        <Link
          to="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm font-medium"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
      data-testid="route-error-boundary"
    >
      <h1 className="text-foreground text-4xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground text-lg">
        An unexpected error occurred. Please try refreshing the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm font-medium"
      >
        Refresh Page
      </button>
    </div>
  );
}

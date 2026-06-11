import { RouterProvider } from '@tanstack/react-router';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { AppProviders } from '@/app/providers/AppProviders.tsx';
import { router } from '@/app/routes/routeTree.tsx';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner.tsx';

function GlobalErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
        <span className="text-2xl" aria-hidden="true">
          !
        </span>
      </div>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        An unexpected error occurred. Please try reloading the page.
      </p>
      {import.meta.env.DEV && globalThis.location?.hostname === 'localhost' && (
        <pre className="bg-muted max-w-lg overflow-auto rounded-md p-4 text-xs">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      )}
      <button
        onClick={resetErrorBoundary}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
      >
        Reload page
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary
      FallbackComponent={GlobalErrorFallback}
      onReset={() => window.location.reload()}
    >
      <AppProviders>
        <Suspense fallback={<FullPageSpinner />}>
          <RouterProvider router={router} />
        </Suspense>
      </AppProviders>
    </ErrorBoundary>
  );
}

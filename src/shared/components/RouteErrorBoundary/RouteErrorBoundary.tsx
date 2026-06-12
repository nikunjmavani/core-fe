import type { ErrorComponentProps } from '@tanstack/react-router';

import { Button } from '@/shared/components/ui/button.tsx';
import { AlertTriangle } from '@/shared/icons/index.ts';

/**
 * Route-level error component wired as `errorComponent` on every route in
 * routeTree.tsx. Scopes a render/loader crash to the island that threw it —
 * the shell, navigation, and the settings hash modal keep working — unlike
 * the root ErrorBoundary, which replaces the whole page.
 */
export function RouteErrorBoundary({ error, reset }: Readonly<ErrorComponentProps>) {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center"
      data-testid="route-error-boundary"
    >
      <AlertTriangle className="text-destructive h-10 w-10" aria-hidden />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">This page hit an error</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {error instanceof Error
            ? error.message
            : 'Something went wrong rendering this page.'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset} data-testid="route-error-retry">
          Try again
        </Button>
        <Button variant="outline" asChild>
          <a href="/">Go home</a>
        </Button>
      </div>
    </div>
  );
}

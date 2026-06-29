import { Link } from '@tanstack/react-router';
import { useEffect } from 'react';

import { composePageTitle } from '@/lib/routes/page-head.ts';
import { Button } from '@/shared/components/ui/button.tsx';

export function Component() {
  // Set the title here, not only on the `$` route's head: notFound() thrown
  // from a beforeLoad guard renders via rootRoute.notFoundComponent, where
  // no route head applies — without this the previous page's title sticks
  // (and the RouteAnnouncer would announce that stale title).
  useEffect(() => {
    document.title = composePageTitle('Page not found');
  }, []);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center sm:p-8"
      data-testid="not-found-page"
    >
      <h1 className="text-foreground text-5xl font-bold sm:text-6xl">404</h1>
      <p className="text-muted-foreground max-w-md text-base sm:text-lg">
        The page you are looking for does not exist.
      </p>
      <Button asChild className="mt-4">
        <Link to="/">Go Home</Link>
      </Button>
    </div>
  );
}

import { Link } from '@tanstack/react-router';

import { Button } from '@/shared/components/ui/button.tsx';

export function Component() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center sm:p-8"
      data-testid="unauthorized-page"
    >
      <h1 className="text-foreground text-3xl font-bold sm:text-4xl">403</h1>
      <p className="text-muted-foreground max-w-md text-base sm:text-lg">
        You do not have permission to access this page.
      </p>
      <Button asChild className="mt-4">
        <Link to="/">Go Home</Link>
      </Button>
    </div>
  );
}

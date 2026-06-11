import { Link } from '@tanstack/react-router';

export function Component() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
      data-testid="unauthorized-page"
    >
      <h1 className="text-foreground text-4xl font-bold">403</h1>
      <p className="text-muted-foreground text-lg">
        You do not have permission to access this page.
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

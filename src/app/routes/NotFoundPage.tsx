import { Link } from '@tanstack/react-router';

export function Component() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
      data-testid="not-found-page"
    >
      <h1 className="text-foreground text-6xl font-bold">404</h1>
      <p className="text-muted-foreground text-lg">
        The page you are looking for does not exist.
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

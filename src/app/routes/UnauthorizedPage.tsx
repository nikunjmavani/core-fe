import { Link } from '@tanstack/react-router';

import { logout } from '@/shared/auth/service.ts';
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
      {/* Two escapes so this page is never a dead-end: "Go Home" for the common
          case, and a guaranteed "Sign out" for when the resolved home would loop
          straight back here (e.g. a session whose active org denies its own
          landing surface). */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link to="/">Go Home</Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void logout();
          }}
          data-testid="unauthorized-sign-out"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

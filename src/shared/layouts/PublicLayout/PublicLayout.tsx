import { Outlet } from '@tanstack/react-router';

/**
 * Minimal centered chrome for public, non-app routes that aren't the auth forms
 * — `/callback`, `/unauthorized`, `/onboarding`, `/accept-invite/$id`, and the
 * 404. No sidebar/header (those belong to the authenticated `ProtectedLayout`);
 * just a centered, responsive content column. Wired as a pathless route layout
 * in the route tree (Phase 4).
 */
export function PublicLayout() {
  return (
    <div
      className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center p-4 sm:p-6"
      data-testid="public-layout"
    >
      <main className="w-full max-w-md">
        <Outlet />
      </main>
    </div>
  );
}

import { useRouterState } from '@tanstack/react-router';

/**
 * Thin top-edge progress bar shown while the router resolves a navigation
 * (beforeLoad guards, loaders, lazy chunks). Gives feedback for in-app
 * transitions — e.g. switching organizations — WITHOUT blanking the page to a
 * full-screen spinner, so the current screen stays put until the next is ready.
 * Indeterminate; honours reduced-motion via the global rule.
 */
export function RouteProgressBar() {
  const isNavigating = useRouterState({ select: (s) => s.status === 'pending' });
  if (!isNavigating) return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-busy="true"
      data-testid="route-progress"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
    >
      <div className="bg-primary h-full w-2/5 animate-[route-progress_1.1s_ease-in-out_infinite] rounded-r-full" />
    </div>
  );
}

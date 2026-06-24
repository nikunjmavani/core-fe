/**
 * Full-page branded loader used during app bootstrap and auth checks. A
 * "breathing" brand tile + wordmark + indeterminate bar — NOT a rotating
 * spinner, so swapping between React loading boundaries during boot doesn't show
 * a visible animation "restart". `fixed inset-0` so it can never introduce a
 * scrollbar. Mirrors the index.html boot splash for a seamless HTML→React
 * handoff. Reduced-motion is honoured by the global rule.
 */
export function FullPageSpinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-testid="full-page-spinner"
      className="bg-background fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-hidden"
    >
      <div className="flex flex-col items-center gap-4">
        <span
          className="bg-primary size-12 animate-[breathe_1.6s_ease-in-out_infinite] rounded-2xl"
          aria-hidden="true"
        />
        <span className="text-foreground text-base font-semibold tracking-tight">
          Core Admin
        </span>
      </div>
      <span
        className="bg-muted block h-1 w-32 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        <span className="bg-primary block h-full w-1/2 animate-[route-progress_1.1s_ease-in-out_infinite] rounded-full" />
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

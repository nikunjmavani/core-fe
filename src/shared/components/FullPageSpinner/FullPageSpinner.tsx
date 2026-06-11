import { Loader2 } from 'lucide-react';

/**
 * Full-page loading spinner used during app bootstrap and auth checks.
 */
export function FullPageSpinner() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      data-testid="full-page-spinner"
    >
      <Loader2 className="text-primary h-8 w-8 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

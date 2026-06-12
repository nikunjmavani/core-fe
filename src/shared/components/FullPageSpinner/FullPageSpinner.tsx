import { Loader2 } from '@/shared/icons/index.ts';

/**
 * Full-page loading spinner used during app bootstrap and auth checks.
 */
export function FullPageSpinner() {
  return (
    <output
      className="flex min-h-screen items-center justify-center"
      data-testid="full-page-spinner"
    >
      <Loader2 className="text-primary h-8 w-8 animate-spin" />
      <span className="sr-only">Loading...</span>
    </output>
  );
}

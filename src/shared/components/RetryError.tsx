import { AlertCircle } from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';

interface RetryErrorProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

/**
 * Shared error fallback with retry button.
 * Used when API calls fail and the user can attempt to reload.
 */
export function RetryError({
  message = 'Something went wrong.',
  onRetry,
  isRetrying = false,
}: RetryErrorProps) {
  return (
    <div
      role="alert"
      data-testid="retry-error"
      className="flex flex-col items-center gap-4 py-12"
    >
      <AlertCircle className="text-destructive h-12 w-12" aria-hidden="true" />
      <p className="text-muted-foreground">{message}</p>
      <Button onClick={onRetry} isLoading={isRetrying} data-testid="retry-button">
        Try again
      </Button>
    </div>
  );
}

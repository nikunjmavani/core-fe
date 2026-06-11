import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils.ts';

interface FormErrorProps {
  message?: string | null;
  className?: string;
  'data-testid'?: string;
}

/**
 * Standalone error display for non-field errors (API errors, general form errors).
 */
export function FormError({
  message,
  className,
  'data-testid': dataTestId,
}: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      data-testid={dataTestId ?? 'form-error'}
      className={cn(
        'border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-4 py-3 text-sm',
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

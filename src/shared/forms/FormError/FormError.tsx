import { cn } from '@/lib/utils.ts';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';
import { AlertCircle } from '@/shared/icons/index.ts';

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
    <Card
      data-testid={dataTestId ?? 'form-error'}
      className={cn(
        'border-destructive/20 bg-destructive/10 text-destructive gap-0 py-0 shadow-none',
        className,
      )}
      role="alert"
    >
      <CardContent className="flex items-center gap-2 px-4 py-3 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </CardContent>
    </Card>
  );
}

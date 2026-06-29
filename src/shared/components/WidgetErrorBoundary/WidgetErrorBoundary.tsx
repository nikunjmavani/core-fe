import type { ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';
import { AlertTriangle } from '@/shared/icons/index.ts';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  /** Short label shown in the fallback (e.g. "Analytics"). */
  title: string;
  /** Optional test id for the fallback container. */
  testId?: string;
}

function SectionErrorFallback({
  title,
  testId,
  resetErrorBoundary,
}: FallbackProps & { title: string; testId?: string }) {
  const { t } = useTranslation(ERRORS_NS);

  return (
    <Card className="border-dashed" data-testid={testId ?? 'widget-error'} role="alert">
      <CardContent className="flex min-h-[120px] flex-col items-center justify-center gap-3 p-4 text-center">
        <AlertTriangle className="text-muted-foreground size-7" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">
            {t(ERRORS_KEYS.widget.unavailable, { title })}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t(ERRORS_KEYS.widget.message)}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={resetErrorBoundary}>
          {t(ERRORS_KEYS.widget.retry)}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Section-level error boundary so one failing widget does not blank the whole page.
 */
export function SectionErrorBoundary({
  children,
  title,
  testId,
}: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallbackRender={(props) => (
        <SectionErrorFallback {...props} title={title} testId={testId} />
      )}
      onError={(error, info) => {
        if (import.meta.env.DEV) {
          console.error(`[SectionErrorBoundary:${title}]`, error, info);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/** @deprecated Use {@link SectionErrorBoundary} — kept for existing imports/tests. */
export const WidgetErrorBoundary = SectionErrorBoundary;

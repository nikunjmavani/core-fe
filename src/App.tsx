import { RouterProvider } from '@tanstack/react-router';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { reportReactError } from '@/app/observability/sentry.ts';
import { AppProviders } from '@/app/providers/AppProviders.tsx';
import { router } from '@/app/routes/routeTree.tsx';
import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import { InvisibleTurnstile } from '@/shared/auth/captcha/InvisibleTurnstile.tsx';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';

function GlobalErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const { t } = useTranslation(ERRORS_NS);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
        <span className="text-2xl" aria-hidden="true">
          !
        </span>
      </div>
      <h1 className="text-xl font-semibold">{t(ERRORS_KEYS.global.title)}</h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        {t(ERRORS_KEYS.global.message)}
      </p>
      {import.meta.env.DEV && globalThis.location?.hostname === 'localhost' && (
        <Card className="max-w-lg gap-0 py-0 shadow-none">
          <CardContent className="overflow-auto p-4 font-mono text-xs">
            {error instanceof Error ? error.message : String(error)}
          </CardContent>
        </Card>
      )}
      <Button type="button" onClick={resetErrorBoundary}>
        {t(ERRORS_KEYS.global.reload)}
      </Button>
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary
        FallbackComponent={GlobalErrorFallback}
        onError={reportReactError}
        onReset={() => window.location.reload()}
      >
        {/* Solves Cloudflare Turnstile invisibly and keeps a fresh token for auth POSTs. */}
        <InvisibleTurnstile />
        <Suspense fallback={<FullPageSpinner />}>
          <RouterProvider router={router} />
        </Suspense>
      </ErrorBoundary>
    </AppProviders>
  );
}

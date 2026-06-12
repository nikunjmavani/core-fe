import type { AnyRouter } from '@tanstack/react-router';

import { config } from '@/core/config/env.ts';
import { scrubEventUrls } from '@/lib/telemetry-scrub.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

/**
 * Initialize Sentry off the critical path.
 *
 * The module is dynamically imported from `main.tsx` during idle time. Heavy
 * integrations (session replay, browser profiling) are only registered in
 * production so dev/preview bundles stay smaller.
 *
 * @param router - TanStack Router instance for route-aware tracing.
 */
export async function initSentry(router: AnyRouter): Promise<void> {
  if (!config.sentryDsn) return;

  const Sentry = await import('@sentry/react');

  const integrations = [Sentry.tanstackRouterBrowserTracingIntegration(router)];

  if (config.isProduction) {
    integrations.push(
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.browserProfilingIntegration(),
    );
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.environment,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    enabled: config.isProduction,
    integrations,

    tracesSampleRate: config.isProduction ? 0.1 : 1.0,
    profilesSampleRate: config.isProduction ? 1.0 : 0,
    tracePropagationTargets: ['localhost', /^https:\/\/api\./, /^\/api\//],

    replaysSessionSampleRate: config.isProduction ? 0.1 : 0,
    replaysOnErrorSampleRate: config.isProduction ? 1.0 : 0,

    ignoreErrors: [/Object \[object Object\] has no method 'updateFrom'/],

    beforeSend(event) {
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.category === 'ui.input') {
            return { ...breadcrumb, message: '[Filtered]' };
          }
          return breadcrumb;
        });
      }
      // Reset/verify tokens must never reach Sentry via request.url or
      // navigation breadcrumbs (the pages scrub the address bar, but an
      // error can fire before that effect runs).
      return scrubEventUrls(event);
    },

    // Transactions skip beforeSend; pageload spans carry the full URL.
    beforeSendTransaction(event) {
      return scrubEventUrls(event);
    },
  });

  useAuthStore.subscribe((state) => {
    if (state.user) {
      Sentry.setUser({ id: state.user.id });
    } else {
      Sentry.setUser(null);
    }
  });
}

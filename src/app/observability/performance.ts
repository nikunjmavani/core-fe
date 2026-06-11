import type { Metric } from 'web-vitals';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

/**
 * Report Web Vitals metrics to analytics/observability.
 *
 * Uses INP (Interaction to Next Paint) — the replacement for FID
 * as of March 2024 Core Web Vitals update.
 *
 * Sends metrics to:
 * - Console (dev only)
 * - PostHog (web_vital custom event)
 * - Sentry (warning on poor ratings)
 */
export function initPerformanceMonitoring(): void {
  const reportMetric = (metric: Metric) => {
    // Log in development
    if (import.meta.env.DEV) {
      console.info(
        `[Web Vitals] ${metric.name}:`,
        metric.value.toFixed(2),
        metric.rating,
      );
    }

    // Send to PostHog (lazy import to avoid blocking startup)
    try {
      import('@/app/analytics/posthog.ts')
        .then(({ posthog }) => {
          if (posthog.__loaded) {
            posthog.capture('web_vital', {
              name: metric.name,
              value: metric.value,
              rating: metric.rating,
              delta: metric.delta,
              navigationType: metric.navigationType,
            });
          }
        })
        .catch(() => {
          /* noop */
        });
    } catch {
      // noop
    }

    // Alert Sentry on poor metrics
    if (metric.rating === 'poor') {
      try {
        import('@sentry/react')
          .then((Sentry) => {
            Sentry.captureMessage(`Poor Web Vital: ${metric.name} = ${metric.value}`, {
              level: 'warning',
              tags: { webVital: metric.name, rating: metric.rating },
            });
          })
          .catch(() => {
            /* noop */
          });
      } catch {
        // noop
      }
    }
  };

  onCLS(reportMetric);
  onINP(reportMetric); // Replaces deprecated onFID
  onLCP(reportMetric);
  onFCP(reportMetric);
  onTTFB(reportMetric);
}

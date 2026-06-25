import type { ConsentDecision } from '@/shared/store/useConsentStore/index.ts';

/** PostHog event emitted once when the user accepts the cookie banner. */
export const ANALYTICS_CONSENT_EVENT = 'analytics_consent_decision';

/**
 * Record an explicit analytics-consent choice for audit/compliance.
 *
 * - **granted** — initializes PostHog (idempotent) and captures a single event.
 * - **denied** — no third-party capture; the decision lives in {@link useConsentStore} only.
 */
export async function captureAnalyticsConsentDecision(
  decision: Exclude<ConsentDecision, null>,
): Promise<void> {
  if (decision === 'denied') return;

  const { initPostHog, posthog } = await import('@/app/analytics/posthog.ts');
  initPostHog();
  posthog.capture(ANALYTICS_CONSENT_EVENT, {
    decision: 'granted',
    source: 'consent_banner',
  });
}

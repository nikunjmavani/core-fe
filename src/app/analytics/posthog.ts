import posthog from 'posthog-js';

import { config } from '@/core/config/env.ts';
import { scrubObjectUrls } from '@/lib/telemetry-scrub.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { hasAnalyticsConsent } from '@/shared/store/useConsentStore/index.ts';

let initialized = false;

/**
 * Initialize PostHog analytics.
 *
 * Gracefully handles missing key or init failure — analytics
 * is never a hard dependency and must not block the app.
 */
export function initPostHog(): void {
  if (initialized) return;

  // Defense in depth: PostHog sets cookies + captures pageviews, so it must
  // never initialize without analytics consent — even if a caller forgets to
  // gate it (the boot sequence and ConsentBanner already do).
  if (!hasAnalyticsConsent()) {
    if (import.meta.env.DEV) {
      console.info('[PostHog] Analytics consent not granted — not initializing');
    }
    return;
  }

  const key = config.posthogKey;
  const host = config.posthogHost;

  if (!key) {
    if (import.meta.env.DEV) {
      console.info('[PostHog] No API key — analytics disabled');
    }
    return;
  }

  try {
    posthog.init(key, {
      api_host: host?.length ? host : 'https://us.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      autocapture: false, // We capture specific events explicitly
      // Passive capture stays OFF: no autocapture, and session recording is
      // disabled in code so a server-side dashboard toggle can't silently
      // start recording the authenticated admin DOM (member lists, org data).
      disable_session_recording: true,
      // Pageview/pageleave events capture $current_url (and $set_once
      // person props capture the initial URL) — scrub reset/verify
      // `?token=` secrets before anything leaves the browser.
      before_send: (event) => {
        if (event?.properties) scrubObjectUrls(event.properties);
        return event;
      },
    });
    initialized = true;

    // The anonymous distinct_id persists in localStorage: without a reset,
    // successive users on a shared admin workstation chain into ONE PostHog
    // profile. Synchronous (zustand notifies inline), so it lands before
    // forceLogout's hard redirect unloads the page.
    let hadUser = useAuthStore.getState().user !== null;
    useAuthStore.subscribe((state) => {
      const hasUser = state.user !== null;
      if (hadUser && !hasUser) posthog.reset();
      hadUser = hasUser;
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[PostHog] Initialization failed:', error);
    }
  }
}

export { posthog };

import posthog from 'posthog-js';

import { config } from '@/core/config/env.ts';

let initialized = false;

/**
 * Initialize PostHog analytics.
 *
 * Gracefully handles missing key or init failure — analytics
 * is never a hard dependency and must not block the app.
 */
export function initPostHog(): void {
  if (initialized) return;

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
    });
    initialized = true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[PostHog] Initialization failed:', error);
    }
  }
}

export { posthog };

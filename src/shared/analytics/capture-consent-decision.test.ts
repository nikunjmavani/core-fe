import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    reset: vi.fn(),
    __loaded: false,
  },
}));

vi.mock('@/core/config/env.ts', () => ({
  config: {
    posthogKey: 'phc_test_key',
    posthogHost: 'https://us.i.posthog.com',
  },
}));

vi.mock('@/shared/store/useConsentStore/index.ts', () => ({
  hasAnalyticsConsent: vi.fn(() => true),
}));

import posthog from 'posthog-js';

import {
  ANALYTICS_CONSENT_EVENT,
  captureAnalyticsConsentDecision,
} from './capture-consent-decision.ts';

describe('captureAnalyticsConsentDecision', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('captures a PostHog event when consent is granted', async () => {
    await captureAnalyticsConsentDecision('granted');

    expect(posthog.capture).toHaveBeenCalledWith(ANALYTICS_CONSENT_EVENT, {
      decision: 'granted',
      source: 'consent_banner',
    });
  });

  it('does not capture when consent is denied', async () => {
    await captureAnalyticsConsentDecision('denied');

    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

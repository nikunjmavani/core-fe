import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { router } from '@/app/routes/routeTree.tsx';
import { startVersionCheck } from '@/core/version/check.ts';
import { subscribeToAuthBroadcast } from '@/shared/auth/auth-channel.ts';
import { handleCrossTabLogout, silentRefresh } from '@/shared/auth/service.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import {
  hasAnalyticsConsent,
  useConsentStore,
} from '@/shared/store/useConsentStore/index.ts';
import { resolveOrganizationFromSubdomain } from '@/shared/tenancy/tenancy-service.ts';

import App from './App.tsx';

/**
 * Start cookie-setting analytics (PostHog + web-vitals → PostHog). Idempotent
 * and gated by consent — only ever runs after the user has granted it (boot
 * for returning users, or the moment they Accept the ConsentBanner). Sentry is
 * NOT here: error monitoring runs under legitimate interest (no tracking
 * cookies, masked replay).
 */
let analyticsStarted = false;
function startAnalytics(): void {
  if (analyticsStarted || !hasAnalyticsConsent()) return;
  analyticsStarted = true;
  import('@/app/analytics/posthog.ts')
    .then((m) => m.initPostHog())
    .catch(() => undefined);
  import('@/app/observability/performance.ts')
    .then((m) => m.initPerformanceMonitoring())
    .catch(() => undefined);
}

/**
 * Initialize observability lazily and off the critical path. Sentry always;
 * analytics only with consent. A store subscription starts analytics the
 * instant the user accepts the banner, without a reload.
 */
function initObservabilityWhenIdle(): void {
  useConsentStore.subscribe((state) => {
    if (state.analyticsConsent === 'granted') startAnalytics();
  });

  const run = () => {
    import('@/app/observability/sentry.ts')
      .then((m) => m.initSentry(router))
      .catch(() => undefined);
    startAnalytics();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1);
  }
}

// ── 1. Bootstrap: resolve organization → mount React immediately → silent auth in background ──
const root = createRoot(document.getElementById('root')!);

// Resolve organization from subdomain (SYNC — just parses hostname). Seeds the
// derived organization store before anything renders; the URL/guards take over
// once routing starts.
resolveOrganizationFromSubdomain();

// Mount React immediately so user sees app (spinner or login) instead of blank screen.
// Silent refresh runs in background; when it fails, clearAuth() updates store and router reacts.
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Attempt silent refresh in background (no backend = fast fail → login screen)
silentRefresh().catch(() => {
  if (import.meta.env.DEV) {
    console.info('[Bootstrap] No active session');
  }
  useAuthStore.getState().clearAuth(); // sets isLoading=false, isAuthenticated=false
});

// Initialize observability/analytics off the critical path (idle time).
initObservabilityWhenIdle();

// Start version check — auto-reload when new deployment is detected (production only)
startVersionCheck();

// Cross-tab logout: when any tab's session dies (admin-suspend, logout-all,
// expiry), every open tab clears its in-memory token and returns to login.
subscribeToAuthBroadcast(handleCrossTabLogout);

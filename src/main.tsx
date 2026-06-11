import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { router } from '@/app/routes/routeTree.tsx';
import { startVersionCheck } from '@/core/version/check.ts';
import { resolveTenantFromSubdomain } from '@/shared/api/tenancy-service.ts';
import { silentRefresh } from '@/shared/auth/service.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import App from './App.tsx';

/**
 * Initialize observability + analytics lazily and off the critical path.
 *
 * Sentry, PostHog, and performance monitoring are dynamically imported during
 * browser idle time so they never bloat the entry chunk or delay first paint.
 */
function initObservabilityWhenIdle(): void {
  const run = () => {
    import('@/app/observability/sentry.ts')
      .then((m) => m.initSentry(router))
      .catch(() => undefined);
    import('@/app/analytics/posthog.ts')
      .then((m) => m.initPostHog())
      .catch(() => undefined);
    import('@/app/observability/performance.ts')
      .then((m) => m.initPerformanceMonitoring())
      .catch(() => undefined);
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1);
  }
}

// ── 1. Bootstrap: resolve tenant → mount React immediately → silent auth in background ──
const root = createRoot(document.getElementById('root')!);

// Resolve tenant from subdomain (SYNC — just parses hostname)
// Must happen before silentRefresh so X-Tenant-ID header is available
resolveTenantFromSubdomain();

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

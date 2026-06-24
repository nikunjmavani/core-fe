import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { config } from '@/core/config/env.ts';
import { performMockLogin } from '@/shared/auth/mock-auth.ts';
import { popReturnTo } from '@/shared/auth/redirect-safety.ts';
import { silentRefresh } from '@/shared/auth/service.ts';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';

/**
 * OAuth return handler. After the provider round-trip the backend sets the
 * HttpOnly refresh cookie and redirects here. We exchange that cookie for an
 * access token via `silentRefresh()` (POST /auth/refresh) and then resolve the
 * root redirect — which routes to the dashboard for the active org, or to
 * onboarding. A failed exchange falls back to the login screen.
 *
 * Magic-link is a code-entry flow on the login screen — never a URL token — so
 * there is no `?token=` to read here.
 */
export function CallbackPage() {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      if (config.useMockApi) {
        await performMockLogin();
        // Honor a returnTo stashed before the OAuth round-trip (FE-59), else the
        // `/` resolver picks the active-org dashboard.
        void navigate({ to: popReturnTo() ?? '/', replace: true });
        return;
      }
      try {
        // Exchange the HttpOnly refresh cookie for an access token + profile.
        await silentRefresh();
      } catch {
        void navigate({ to: '/login', replace: true });
        return;
      }
      void navigate({ to: popReturnTo() ?? '/', replace: true });
    })();
  }, [navigate]);

  return (
    <div data-testid="callback-page">
      <FullPageSpinner />
    </div>
  );
}

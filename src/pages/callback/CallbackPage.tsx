import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { config } from '@/core/config/env.ts';
import { performMockLogin } from '@/shared/auth/mock-auth.ts';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';

/**
 * OAuth return handler. After the provider round-trip the backend sets the
 * HttpOnly refresh cookie and redirects here; the access token is obtained via
 * silent refresh at app bootstrap, so this page just resolves the root redirect
 * (which routes to the dashboard for the active org, or onboarding).
 *
 * Magic-link is a code-entry flow on the login screen — never a URL token — so
 * there is no `?token=` to exchange here.
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
      }
      // OAuth (cookie-delivered) → silent refresh at bootstrap has the token;
      // resolve the root redirect to land on the right space.
      void navigate({ to: '/', replace: true });
    })();
  }, [navigate]);

  return (
    <div data-testid="callback-page">
      <FullPageSpinner />
    </div>
  );
}

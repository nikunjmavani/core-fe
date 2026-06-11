import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { config } from '@/core/config/env.ts';
import { performMockLogin } from '@/shared/auth/mock-auth.ts';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';

/**
 * OAuth / magic-link return handler. In mock mode it completes a mock login and
 * redirects to the dashboard. With a live backend, the access token is delivered
 * via the HttpOnly refresh cookie + silent refresh (REPLACE_WITH_API).
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
      navigate({ to: '/', replace: true });
    })();
  }, [navigate]);

  return (
    <div data-testid="callback-page">
      <FullPageSpinner />
    </div>
  );
}

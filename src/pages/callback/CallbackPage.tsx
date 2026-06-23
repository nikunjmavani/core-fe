import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { config } from '@/core/config/env.ts';
import { authApi } from '@/shared/api/auth-api.ts';
import { performMockLogin } from '@/shared/auth/mock-auth.ts';
import { scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { markSessionStart } from '@/shared/auth/session-lifetime.ts';
import { setAccessToken } from '@/shared/auth/token.ts';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

/**
 * OAuth / magic-link return handler.
 * - Mock mode: completes a mock login, then redirects to the dashboard.
 * - Magic-link: a `?token=` in the URL is exchanged for a session via
 *   `POST /auth/magic-link/verify` (the backend points the emailed link here).
 * - OAuth: the access token arrives via the HttpOnly refresh cookie + silent
 *   refresh — no token in the URL, so just resolve to the dashboard.
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
        void navigate({ to: '/', replace: true });
        return;
      }

      // Magic-link: exchange the one-time token for a session. Navigating away
      // (replace) scrubs the token from the URL/history afterwards.
      const token = new URLSearchParams(window.location.search).get('token');
      if (token) {
        try {
          const { accessToken } = await authApi.magicLinkVerify(token);
          setAccessToken(accessToken);
          markSessionStart();
          const user = await authApi.me(accessToken);
          useAuthStore.getState().setUser(user);
          scheduleTokenRefresh();
        } catch {
          void navigate({ to: '/login', replace: true });
          return;
        }
      }
      // OAuth (cookie-delivered) or post-magic-link → resolve the root redirect.
      void navigate({ to: '/', replace: true });
    })();
  }, [navigate]);

  return (
    <div data-testid="callback-page">
      <FullPageSpinner />
    </div>
  );
}

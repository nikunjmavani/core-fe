import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { ANALYTICS_EVENTS } from '@/shared/analytics/analytics.constants.ts';
import { captureAnalyticsEvent } from '@/shared/analytics/capture.ts';
import { skipAutoGoogleSignIn } from '@/shared/auth/auto-google-sign-in.ts';
import { popReturnTo } from '@/shared/auth/redirect-safety.ts';
import { silentRefresh } from '@/shared/auth/service.ts';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';

import { CALLBACK_TEST_IDS } from './callback.constants.ts';

export function CallbackPage() {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        await silentRefresh();
        captureAnalyticsEvent(ANALYTICS_EVENTS.authOauthCompleted);
        captureAnalyticsEvent(ANALYTICS_EVENTS.sessionStarted, { method: 'oauth' });
      } catch {
        skipAutoGoogleSignIn();
        void navigate({ to: '/login', replace: true });
        return;
      }
      const returnTo = popReturnTo();
      void navigate({ to: returnTo ?? '/', replace: true });
    })();
  }, [navigate]);

  return (
    <div data-testid={CALLBACK_TEST_IDS.page}>
      <FullPageSpinner />
    </div>
  );
}

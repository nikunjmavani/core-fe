import { Link, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { authApi } from '@/shared/api/auth-api.ts';
import { scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { setAccessToken } from '@/shared/auth/token.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { FormError } from '@/shared/forms/FormError/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

export function VerifyEmailForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const search: { token?: string } = useSearch({ strict: false });
  const token = typeof search?.token === 'string' ? search.token : '';

  useEffect(() => {
    if (!token || status !== 'idle') return;
    queueMicrotask(() => setStatus('loading'));
    authApi
      .verifyEmail({ token })
      .then(async ({ accessToken }) => {
        setAccessToken(accessToken);
        const user = await authApi.me(accessToken);
        useAuthStore.getState().setUser(user);
        scheduleTokenRefresh();
      })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setApiError(err instanceof Error ? err.message : 'Verification failed.');
      });
  }, [token, status]);

  if (!token) {
    return (
      <div className="space-y-6" data-testid="verify-email-form">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Invalid link</h1>
          <p className="text-muted-foreground text-sm">
            This verification link is invalid or expired.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="space-y-6 text-center" data-testid="verify-email-form">
        <h1 className="text-2xl font-semibold tracking-tight">Verifying your email...</h1>
        <p className="text-muted-foreground text-sm">Please wait.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-6" data-testid="verify-email-form">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Verification failed</h1>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t verify your email. The link may have expired.
          </p>
        </div>
        <FormError message={apiError} data-testid="form-error" />
        <Button asChild className="w-full">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="verify-email-form">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Email verified</h1>
        <p className="text-muted-foreground text-sm">
          Your email has been verified. You can now continue.
        </p>
      </div>
      <Button asChild className="w-full">
        <Link to="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}

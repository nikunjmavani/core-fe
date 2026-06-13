import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { authApi } from '@/shared/api/auth-api.ts';
import { type MfaVerifyInput, mfaVerifySchema } from '@/shared/api/auth-contracts.ts';
import { scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { markSessionStart } from '@/shared/auth/session-lifetime.ts';
import { setAccessToken } from '@/shared/auth/token.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { FormError } from '@/shared/forms/FormError/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

type LocationState = { mfaToken?: string };

export function MfaForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | undefined;
  const mfaToken = state?.mfaToken ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MfaVerifyInput>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { code: '' },
  });

  const onSubmit = async (data: MfaVerifyInput) => {
    setApiError(null);
    if (!mfaToken) {
      setApiError('Session expired. Please sign in again.');
      return;
    }
    try {
      const { accessToken } = await authApi.mfaVerify(data, mfaToken);
      setAccessToken(accessToken);
      markSessionStart(); // start the absolute session-lifetime clock
      const user = await authApi.me(accessToken);
      useAuthStore.getState().setUser(user);
      scheduleTokenRefresh();
      void navigate({ to: '/', replace: true });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
    }
  };

  if (!mfaToken) {
    return (
      <div className="space-y-6" data-testid="mfa-form">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Session expired</h1>
          <p className="text-muted-foreground text-sm">
            Please sign in again to continue.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="mfa-form">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Two-factor authentication
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormError message={apiError} data-testid="form-error" />

          <div className="space-y-2">
            <Label htmlFor="mfa-code">Code</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              aria-invalid={!!errors.code}
              data-testid="mfa-code"
              {...register('code')}
            />
            {errors.code && (
              <p className="text-destructive text-xs" role="alert">
                {errors.code.message}
              </p>
            )}
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid="mfa-submit"
            >
              {isSubmitting ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

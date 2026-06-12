import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { authApi } from '@/shared/api/auth-api.ts';
import { type LoginInput, loginSchema } from '@/shared/api/auth-contracts.ts';
import { scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { setAccessToken } from '@/shared/auth/token.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { FormError } from '@/shared/forms/FormError/index.ts';
import { Eye, EyeOff } from '@/shared/icons/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import { useCooldownClock } from '../../hooks/useCooldownClock/index.ts';
import { PasswordlessOptions } from '../PasswordlessOptions/index.ts';
import { isSafeRedirectPath } from './redirect-safety.ts';

/** Only allow internal relative paths to prevent open-redirect attacks. */
/** Read redirect path from location (TanStack: search.redirect; React Router legacy: state.from.pathname). */
function getRedirectPath(location: {
  search?: unknown;
  state?: unknown;
}): string | undefined {
  const search = location.search as { redirect?: string } | undefined;
  if (
    search?.redirect &&
    typeof search.redirect === 'string' &&
    isSafeRedirectPath(search.redirect)
  ) {
    return search.redirect;
  }
  const state = location.state as { from?: { pathname?: string } } | undefined;
  if (
    state?.from?.pathname &&
    typeof state.from.pathname === 'string' &&
    isSafeRedirectPath(state.from.pathname)
  ) {
    return state.from.pathname;
  }
  return undefined;
}

function getSubmitLabel(
  isSubmitting: boolean,
  isCoolingDown: boolean,
  cooldownUntil: number | null,
  now: number,
): string {
  if (isSubmitting) return 'Signing in...';
  if (isCoolingDown)
    return `Try again in ${Math.ceil(((cooldownUntil ?? 0) - now) / 1000)}s`;
  return 'Sign in';
}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [failureCount, setFailureCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const now = useCooldownClock(cooldownUntil);
  const navigate = useNavigate();
  const location = useLocation();

  const isCoolingDown = cooldownUntil !== null && cooldownUntil > now;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmitError = () => {
    const count = failureCount + 1;
    setFailureCount(count);
    const delay = count <= 1 ? 2000 : Math.min(2000 * 2 ** (count - 1), 30000);
    // eslint-disable-next-line react-hooks/purity -- only called from async onSubmit catch, not during render
    const timestamp = Date.now();
    setCooldownUntil(timestamp + delay);
  };

  const onSubmit = async (data: LoginInput) => {
    setApiError(null);
    try {
      const { accessToken } = await authApi.login(data);
      setAccessToken(accessToken);
      const user = await authApi.me(accessToken);
      useAuthStore.getState().setUser(user);
      scheduleTokenRefresh();
      setFailureCount(0);
      setCooldownUntil(null);
      const from = getRedirectPath(location);
      void navigate({ to: from ?? '/', replace: true });
    } catch (err) {
      onSubmitError();
      setApiError(
        err instanceof Error ? err.message : 'Unable to sign in. Please try again later.',
      );
    }
  };

  return (
    <div className="space-y-6" data-testid="login-form">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Enter your credentials to sign in to your account
        </p>
      </div>

      {/* Social / passwordless options + divider */}
      <PasswordlessOptions />

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormError message={apiError} data-testid="login-error" />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              data-testid="login-email"
              {...register('email')}
            />
            {errors.email && (
              <p
                className="text-destructive text-xs"
                role="alert"
                data-testid="login-email-error"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-primary hover:text-primary/80 text-xs font-medium underline"
                data-testid="login-link-forgot-password"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                data-testid="login-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="login-password-toggle"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                className="text-destructive text-xs"
                role="alert"
                data-testid="login-password-error"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
              disabled={isSubmitting || isCoolingDown}
              data-testid="login-submit"
            >
              {getSubmitLabel(isSubmitting, isCoolingDown, cooldownUntil, now)}
            </Button>
          </div>
        </div>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="text-primary hover:text-primary/80 font-medium underline"
          data-testid="login-link-sign-up"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { authApi } from '@/shared/api/auth-api.ts';
import { type RegisterInput, registerSchema } from '@/shared/api/auth-contracts.ts';
import { scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { setAccessToken } from '@/shared/auth/token.ts';
import { PasswordStrengthMeter } from '@/shared/components/PasswordStrengthMeter/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { FormError } from '@/shared/forms/FormError/index.ts';
import { Eye, EyeOff } from '@/shared/icons/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isBreached, setIsBreached] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '' },
  });

  const password = watch('password') ?? '';
  const email = watch('email') ?? '';

  const onSubmit = async (data: RegisterInput) => {
    setApiError(null);
    if (isBreached) {
      setApiError('That password appeared in a data breach. Please choose another.');
      return;
    }
    try {
      const { accessToken } = await authApi.register(data);
      setAccessToken(accessToken);
      const user = await authApi.me(accessToken);
      useAuthStore.getState().setUser(user);
      scheduleTokenRefresh();
      void navigate({ to: '/', replace: true });
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Registration failed. Please try again.',
      );
    }
  };

  return (
    <div className="space-y-6" data-testid="register-form">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and password to get started
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormError message={apiError} data-testid="form-error" />

          <div className="space-y-2">
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              data-testid="register-email"
              {...register('email')}
            />
            {errors.email && (
              <p
                className="text-destructive text-xs"
                role="alert"
                data-testid="register-email-error"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                data-testid="register-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="register-password-toggle"
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
                data-testid="register-password-error"
              >
                {errors.password.message}
              </p>
            )}
            <PasswordStrengthMeter
              password={password}
              userInputs={email ? [email] : []}
              onBreachedChange={setIsBreached}
            />
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isBreached}
              data-testid="register-submit"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </div>
        </div>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-primary hover:text-primary/80 font-medium underline"
          data-testid="register-link-sign-in"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

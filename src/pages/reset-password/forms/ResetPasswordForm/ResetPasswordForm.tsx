import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearch } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { authApi } from '@/shared/api/auth-api.ts';
import {
  type ResetPasswordInput,
  resetPasswordSchema,
} from '@/shared/api/auth-contracts.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { FormError } from '@/shared/forms/FormError/index.ts';

export function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const search: { token?: string } = useSearch({ strict: false });
  const token = typeof search?.token === 'string' ? search.token : '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setApiError(null);
    try {
      await authApi.resetPassword({ ...data, token: data.token || token });
      setSuccess(true);
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Failed to reset password. Please try again.',
      );
    }
  };

  if (success) {
    return (
      <div className="space-y-6" data-testid="reset-password-form">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Password reset</h1>
          <p className="text-muted-foreground text-sm">
            Your password has been updated. You can now sign in.
          </p>
        </div>
        <Button asChild className="w-full" data-testid="reset-password-sign-in">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-6" data-testid="reset-password-form">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Invalid link</h1>
          <p className="text-muted-foreground text-sm">
            This reset link is invalid or expired. Request a new one.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to="/forgot-password">Request new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reset-password-form">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="text-muted-foreground text-sm">Enter your new password below.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormError message={apiError} data-testid="form-error" />

          <input type="hidden" {...register('token')} value={token} />

          <div className="space-y-2">
            <Label htmlFor="reset-password">Password</Label>
            <div className="relative">
              <Input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                data-testid="reset-password-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="reset-password-password-toggle"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-xs" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password-confirm">Confirm password</Label>
            <Input
              id="reset-password-confirm"
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              data-testid="reset-password-confirm"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-xs" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid="reset-password-submit"
            >
              {isSubmitting ? 'Updating...' : 'Update password'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

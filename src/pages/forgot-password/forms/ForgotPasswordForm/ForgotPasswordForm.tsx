import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { authApi } from '@/shared/api/auth-api.ts';
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from '@/shared/api/auth-contracts.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { FormError } from '@/shared/forms/FormError/index.ts';

export function ForgotPasswordForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setApiError(null);
    try {
      await authApi.forgotPassword(data);
      setSubmitted(true);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Request failed. Please try again.',
      );
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6" data-testid="forgot-password-form">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-muted-foreground text-sm">
            If an account exists for that email, we&apos;ve sent instructions to reset
            your password.
          </p>
        </div>
        <p className="text-muted-foreground text-center text-sm">
          <Link
            to="/login"
            className="text-primary hover:text-primary/80 font-medium underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="forgot-password-form">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot password?</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormError message={apiError} data-testid="form-error" />

          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">Email</Label>
            <Input
              id="forgot-password-email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'forgot-password-email-error' : undefined}
              data-testid="forgot-password-email"
              {...register('email')}
            />
            {errors.email && (
              <p
                id="forgot-password-email-error"
                className="text-destructive text-xs"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid="forgot-password-submit"
            >
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </Button>
          </div>
        </div>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        <Link
          to="/login"
          className="text-primary hover:text-primary/80 font-medium underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

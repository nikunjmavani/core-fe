import { AuthLayout } from '@/shared/layouts/AuthLayout/index.ts';

import { ForgotPasswordForm } from './forms/ForgotPasswordForm/index.ts';

/**
 * Thin wrapper for the forgot-password route. Mounts the shared {@link AuthLayout}
 * around {@link ForgotPasswordForm}; the form owns all submission + success state.
 */
export function ForgotPasswordPage() {
  return (
    <div data-testid="forgot-password-page">
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </div>
  );
}

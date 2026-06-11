import { AuthLayout } from '@/shared/layouts/AuthLayout/index.ts';

import { ResetPasswordForm } from './forms/ResetPasswordForm/index.ts';

/**
 * Top-level UI for `/reset-password`. Thin wrapper that mounts the
 * shared `AuthLayout` and renders the form.
 */
export function ResetPasswordPage() {
  return (
    <div data-testid="reset-password-page">
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </div>
  );
}

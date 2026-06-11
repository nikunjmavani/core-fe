import { AuthLayout } from '@/shared/layouts/AuthLayout/index.ts';

import { VerifyEmailForm } from './forms/VerifyEmailForm/index.ts';

/**
 * Top-level UI for `/verify-email`. Thin wrapper that mounts the
 * shared `AuthLayout` and renders the form.
 */
export function VerifyEmailPage() {
  return (
    <div data-testid="verify-email-page">
      <AuthLayout>
        <VerifyEmailForm />
      </AuthLayout>
    </div>
  );
}

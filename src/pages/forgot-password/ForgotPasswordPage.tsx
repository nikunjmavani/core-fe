import { ForgotPasswordForm } from './forms/ForgotPasswordForm/index.ts';

/**
 * Thin wrapper for the forgot-password route; the form owns all submission +
 * success state. Shell: the pathless `auth-shell` route mounts AuthLayout.
 */
export function ForgotPasswordPage() {
  return (
    <div data-testid="forgot-password-page">
      <ForgotPasswordForm />
    </div>
  );
}

import { ResetPasswordForm } from './forms/ResetPasswordForm/index.ts';

/**
 * Top-level UI for `/reset-password`. Thin wrapper that renders the form.
 * Shell: the pathless `auth-shell` route in routeTree mounts AuthLayout.
 */
export function ResetPasswordPage() {
  return (
    <div data-testid="reset-password-page">
      <ResetPasswordForm />
    </div>
  );
}

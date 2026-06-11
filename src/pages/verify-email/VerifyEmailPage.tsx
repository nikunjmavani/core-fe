import { VerifyEmailForm } from './forms/VerifyEmailForm/index.ts';

/**
 * Top-level UI for `/verify-email`. Thin wrapper that renders the form.
 * Shell: the pathless `auth-shell` route in routeTree mounts AuthLayout.
 */
export function VerifyEmailPage() {
  return (
    <div data-testid="verify-email-page">
      <VerifyEmailForm />
    </div>
  );
}

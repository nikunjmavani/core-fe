import { LoginForm } from './forms/LoginForm/index.ts';

/**
 * Top-level UI for the `/login` route island. Thin wrapper that hosts the
 * `LoginForm`; the auth shell (logo, background) comes from `AuthLayout`
 * mounted by `login.route.tsx`.
 */
export function LoginPage() {
  return (
    <div data-testid="login-page">
      <LoginForm />
    </div>
  );
}

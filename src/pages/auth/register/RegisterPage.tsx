import { RegisterForm } from './forms/RegisterForm/index.ts';

/**
 * Top-level UI for the `/register` route. Thin wrapper that mounts the
 * {@link RegisterForm} inside the page boundary and exposes the page-level
 * `data-testid` for E2E selection.
 */
export function RegisterPage() {
  return (
    <div data-testid="register-page">
      <RegisterForm />
    </div>
  );
}

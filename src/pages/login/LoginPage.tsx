import { AuthForm } from '@/shared/forms/AuthForm/index.ts';

import { LOGIN_TEST_IDS } from './login.constants.ts';

/**
 * Top-level UI for the unified auth route (`/login`). One screen for sign-in
 * and sign-up — continue with Google, GitHub, passkey, or email OTP.
 */
export function LoginPage() {
  return (
    <div data-testid={LOGIN_TEST_IDS.page}>
      <AuthForm />
    </div>
  );
}

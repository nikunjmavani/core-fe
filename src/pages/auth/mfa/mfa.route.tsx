import { AuthLayout } from '@/shared/layouts/AuthLayout/index.ts';

import { MfaPage } from './MfaPage.tsx';

/**
 * MFA route — TOTP verification after login when MFA is enabled.
 * Exports `Component` for the router's lazy() resolution.
 */
export function Component() {
  return (
    <AuthLayout>
      <MfaPage />
    </AuthLayout>
  );
}

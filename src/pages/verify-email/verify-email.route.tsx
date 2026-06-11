import { requirePermission } from '@/core/rbac/guards.ts';

import { page } from './verify-email.page.ts';
import { VerifyEmailPage } from './VerifyEmailPage.tsx';

/**
 * Verify email route — lazy loaded.
 */
export function Component() {
  return <VerifyEmailPage />;
}

export function loader() {
  if (page.permission) requirePermission(page.permission);
  return null;
}

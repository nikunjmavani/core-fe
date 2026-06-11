import { requirePermission } from '@/core/rbac/guards.ts';

import { manifest } from './verify-email.manifest.ts';
import { VerifyEmailPage } from './VerifyEmailPage.tsx';

/**
 * Verify email route — lazy loaded.
 */
export function Component() {
  return <VerifyEmailPage />;
}

export function loader() {
  if (manifest.permission) requirePermission(manifest.permission);
  return null;
}

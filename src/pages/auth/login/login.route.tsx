import { requirePermission } from '@/core/rbac/guards.ts';
import { AuthLayout } from '@/shared/layouts/AuthLayout/index.ts';

import { page } from './login.page.ts';
import { LoginPage } from './LoginPage.tsx';

/**
 * Login route — lazy loaded.
 * Exports `Component` for the router's lazy() resolution.
 */
export function Component() {
  return (
    <AuthLayout>
      <LoginPage />
    </AuthLayout>
  );
}

export function loader() {
  if (page.permission) requirePermission(page.permission);
  return null;
}

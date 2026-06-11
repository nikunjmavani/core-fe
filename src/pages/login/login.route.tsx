import { requirePermission } from '@/core/rbac/guards.ts';

import { page } from './login.page.ts';
import { LoginPage } from './LoginPage.tsx';

/**
 * Login route — lazy loaded.
 * Exports `Component` for the router's lazy() resolution.
 * Shell: the pathless `auth-shell` route in routeTree mounts AuthLayout.
 */
export function Component() {
  return <LoginPage />;
}

export function loader() {
  if (page.permission) requirePermission(page.permission);
  return null;
}

import { requirePermission } from '@/core/rbac/guards.ts';

import { manifest } from './login.manifest.ts';
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
  if (manifest.permission) requirePermission(manifest.permission);
  return null;
}

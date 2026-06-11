import { Navigate, Outlet } from '@tanstack/react-router';

import { AUTH_ROUTES } from '@/core/config/constants.ts';
import { hasPermission, type OrgPermission } from '@/core/rbac/policies.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useTenantStore } from '@/shared/store/useTenantStore/index.ts';

interface RBACGuardProps {
  /** Required org-scoped permission for the wrapped subtree. */
  permission: OrgPermission;
}

/**
 * Route-level RBAC guard component. Renders the child route (`<Outlet />`) only
 * when the user holds the required org-scoped permission; otherwise redirects to
 * `/unauthorized`. Waits for auth to resolve before deciding.
 *
 * @example
 * createRoute({ component: () => <RBACGuard permission="subscription:manage" /> });
 */
export function RBACGuard({ permission }: RBACGuardProps) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const permissions = useTenantStore((s) => s.permissions);

  // Wait for auth to resolve before making permission decisions
  if (isLoading) {
    return null;
  }

  if (!user || !hasPermission({ role: user.role, permissions }, permission)) {
    return <Navigate to={AUTH_ROUTES.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
}

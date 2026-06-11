import { redirect } from '@tanstack/react-router';

import { AUTH_ROUTES } from '@/core/config/constants.ts';
import { hasPermission, type OrgPermission } from '@/core/rbac/policies.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useTenantStore } from '@/shared/store/useTenantStore/index.ts';

/**
 * Route loader/`beforeLoad` guard — throws a redirect if the user lacks an
 * org-scoped permission in the active organization.
 *
 * Redirects to `/login` when unauthenticated, or `/unauthorized` when authenticated
 * but missing the permission.
 *
 * @param permission - The required org-scoped permission code.
 *
 * @example
 * beforeLoad: () => requirePermission('membership:read');
 */
export function requirePermission(permission: OrgPermission): void {
  const { user, isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated || !user) {
    throw redirect({ to: AUTH_ROUTES.LOGIN });
  }

  const { permissions } = useTenantStore.getState();
  if (!hasPermission({ role: user.role, permissions }, permission)) {
    throw redirect({ to: AUTH_ROUTES.UNAUTHORIZED });
  }
}

/**
 * Route loader guard — throws redirect if not authenticated.
 */
export function requireAuth(): void {
  const { isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated) {
    throw redirect({ to: AUTH_ROUTES.LOGIN });
  }
}

import { hasPermission, type OrganizationPermission } from '@/core/rbac/policies.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

/** A UI access requirement: an org-scoped permission and/or a team-org guard. */
export interface AccessCheck {
  /** Org-scoped permission the user must hold in the active org. */
  permission?: OrganizationPermission;
  /**
   * Require a TEAM organization — a personal org is blocked. The explicit
   * personal-vs-team guard that replaced the removed `capabilities` object.
   */
  teamOrganizationOnly?: boolean;
}

function passes(
  check: AccessCheck,
  user: ReturnType<typeof useAuthStore.getState>['user'],
  permissions: ReturnType<typeof useOrganizationStore.getState>['permissions'],
  organizationType: ReturnType<typeof useOrganizationStore.getState>['organizationType'],
): boolean {
  const permissionOk =
    !check.permission ||
    (!!user && hasPermission({ role: user.role, permissions }, check.permission));
  const teamOk = !check.teamOrganizationOnly || organizationType === 'TEAM';
  return permissionOk && teamOk;
}

/**
 * Reactive access check for conditional UI. True when **every** supplied
 * requirement is met (AND); permissive with no requirement. This is the UI half
 * of authorization (defense-in-depth) — the route gates (core/security) and the
 * API remain the authoritative boundary.
 */
export function useCan(check: AccessCheck): boolean {
  const user = useAuthStore((s) => s.user);
  const permissions = useOrganizationStore((s) => s.permissions);
  const organizationType = useOrganizationStore((s) => s.organizationType);
  return passes(check, user, permissions, organizationType);
}

/**
 * Filter a list (nav items, settings sections, …) to those the current user may
 * see. Reads the stores once and checks inline — safe for any array length.
 */
export function useVisibleNav<T extends AccessCheck>(items: readonly T[]): T[] {
  const user = useAuthStore((s) => s.user);
  const permissions = useOrganizationStore((s) => s.permissions);
  const organizationType = useOrganizationStore((s) => s.organizationType);
  return items.filter((item) => passes(item, user, permissions, organizationType));
}

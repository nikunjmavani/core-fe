import { hasPermission, type OrganizationPermission } from '@/core/rbac/policies.ts';
import {
  capabilityValue,
  type OrgCapabilityKey,
} from '@/core/security/gates/require-capability.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

/** A UI access requirement: an org-scoped permission and/or an org-type capability. */
export interface AccessCheck {
  /** Org-scoped permission the user must hold in the active org. */
  permission?: OrganizationPermission;
  /** Org-type capability the active org must have (personal orgs lack all). */
  capability?: OrgCapabilityKey;
}

function passes(
  check: AccessCheck,
  user: ReturnType<typeof useAuthStore.getState>['user'],
  permissions: ReturnType<typeof useOrganizationStore.getState>['permissions'],
  capabilities: ReturnType<typeof useOrganizationStore.getState>['capabilities'],
): boolean {
  if (check.permission) {
    if (!user || !hasPermission({ role: user.role, permissions }, check.permission)) {
      return false;
    }
  }
  if (check.capability) {
    if (!capabilities || !capabilityValue(capabilities, check.capability)) return false;
  }
  return true;
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
  const capabilities = useOrganizationStore((s) => s.capabilities);
  return passes(check, user, permissions, capabilities);
}

/**
 * Filter a list (nav items, settings sections, …) to those the current user may
 * see. Reads the stores once and checks inline — safe for any array length.
 */
export function useVisibleNav<T extends AccessCheck>(items: readonly T[]): T[] {
  const user = useAuthStore((s) => s.user);
  const permissions = useOrganizationStore((s) => s.permissions);
  const capabilities = useOrganizationStore((s) => s.capabilities);
  return items.filter((item) => passes(item, user, permissions, capabilities));
}

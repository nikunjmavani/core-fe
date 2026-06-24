import { redirect } from '@tanstack/react-router';

import { AUTH_ROUTES } from '@/core/config/constants.ts';
import type { OrgCapabilityKey } from '@/core/types/permissions.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import type { Gate } from '../gate.types.ts';

export type { OrgCapabilityKey };

/** Exhaustive read — avoids object-injection and stays type-checked. */
export function capabilityValue(
  caps: NonNullable<ReturnType<typeof useOrganizationStore.getState>['capabilities']>,
  key: OrgCapabilityKey,
): boolean {
  switch (key) {
    case 'canInviteMembers':
      return caps.canInviteMembers;
    case 'canManageMembers':
      return caps.canManageMembers;
    case 'canManageRoles':
      return caps.canManageRoles;
    case 'canTransferOwnership':
      return caps.canTransferOwnership;
    case 'canDelete':
      return caps.canDelete;
    case 'canManageBilling':
      return caps.canManageBilling;
    default:
      return false;
  }
}

/**
 * **L6 — org-type capability.** Factory: a personal org has every capability
 * `false`, so team-only surfaces (members, roles, …) are blocked there — by the
 * capability, never by probing the API (which 422s on personal). Redirects to
 * `/unauthorized` when the active org lacks the capability.
 */
export function requireCapabilityGate(capability: OrgCapabilityKey): Gate {
  return () => {
    const caps = useOrganizationStore.getState().capabilities;
    if (!caps || !capabilityValue(caps, capability)) {
      throw redirect({ to: AUTH_ROUTES.UNAUTHORIZED });
    }
  };
}

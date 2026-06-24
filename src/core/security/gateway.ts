import type { OrganizationPermission } from '@/core/rbac/policies.ts';

import type { Gate } from './gate.types.ts';
import {
  type OrgCapabilityKey,
  requireCapabilityGate,
} from './gates/require-capability.ts';
import { requirePermissionGate } from './gates/require-permission.ts';
import { requireSession } from './gates/require-session.ts';

/**
 * The common security gateway — composes access gates into a single
 * `beforeLoad`-style runner. Gates run **sequentially, one by one**, and the
 * **first gate to throw short-circuits** the rest (a redirect / notFound /
 * unauthorized halts entry). This is the single, testable access pipeline that
 * replaces ad-hoc per-route guard calls (research/11 §3.7).
 *
 * @example
 *   beforeLoad: gateway(requireSession, hydrateContext, resolveActiveOrg,
 *                       requireOrgStatus, requirePermission)
 */
export function gateway<TCtx>(...gates: Array<Gate<TCtx>>) {
  return async (ctx: TCtx): Promise<void> => {
    for (const gate of gates) {
      await gate(ctx);
    }
  };
}

/** A route's declared access policy (from its manifest). */
export interface RoutePolicy {
  permission?: OrganizationPermission | null;
  capability?: OrgCapabilityKey;
}

/**
 * Compose the gateway for a route from its declared policy. **Default-deny:**
 * every protected route requires a session even with no explicit
 * permission/capability; the L5 (permission) and L6 (capability) gates are added
 * only when the policy names them. This keeps a "forgot to add a guard" route
 * failing closed (still authenticated) rather than open.
 */
export function gatewayFromPolicy(policy: RoutePolicy) {
  const gates: Gate[] = [requireSession];
  if (policy.permission) gates.push(requirePermissionGate(policy.permission));
  if (policy.capability) gates.push(requireCapabilityGate(policy.capability));
  return gateway(...gates);
}

/**
 * Route-access matrix (FE-52). Composes the real security gateway for a few
 * representative route policies and asserts, across a matrix of user states
 * (signed-out / limited / member / team-admin), exactly which routes are
 * reachable. This is the adversarial backstop for authorization: every "blocked"
 * cell proves an unauthorized caller is turned away by the gateway (L1 session →
 * L5 permission → L6 capability), not merely by a hidden nav item.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { requireCapabilityGate } from '@/core/security/gates/require-capability.ts';
import { requirePermissionGate } from '@/core/security/gates/require-permission.ts';
import { requireSession } from '@/core/security/gates/require-session.ts';
import { gateway } from '@/core/security/gateway.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const ctx = {
  location: { pathname: '/x', search: '', hash: '', href: '/x' },
  params: {},
};

const GUARDS = {
  'authed-only': gateway(requireSession),
  'members:read': gateway(requireSession, requirePermissionGate('membership:read')),
  'members:manage': gateway(
    requireSession,
    requirePermissionGate('membership:read'),
    requireCapabilityGate('canManageMembers'),
  ),
} as const;

type GuardName = keyof typeof GUARDS;

interface UserState {
  name: string;
  authed: boolean;
  perms: ('membership:read' | 'role:manage')[];
  caps: boolean;
}

const STATES: UserState[] = [
  { name: 'signed-out', authed: false, perms: [], caps: false },
  { name: 'limited (no perms)', authed: true, perms: [], caps: false },
  {
    name: 'member (personal org)',
    authed: true,
    perms: ['membership:read'],
    caps: false,
  },
  { name: 'team-admin', authed: true, perms: ['membership:read'], caps: true },
];

/** The authoritative expectation, as explicit logic (no dynamic lookup). */
function expectedReachable(state: UserState, guard: GuardName): boolean {
  if (!state.authed) return false; // L1 blocks everyone signed-out
  if (guard === 'authed-only') return true;
  const hasPerm = state.perms.includes('membership:read'); // L5
  if (guard === 'members:read') return hasPerm;
  return hasPerm && state.caps; // members:manage also needs the L6 capability
}

function applyState(state: UserState) {
  if (state.authed) {
    useAuthStore.setState({
      user: { id: 'u', email: 'a@b.test', role: 'user' },
      isAuthenticated: true,
    });
  } else {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
  useOrganizationStore.setState({
    permissions: state.perms,
    capabilities: {
      canInviteMembers: state.caps,
      canManageMembers: state.caps,
      canManageRoles: state.caps,
      canTransferOwnership: state.caps,
      canDelete: state.caps,
      canManageBilling: state.caps,
    },
  });
}

beforeEach(() => {
  useOrganizationStore.getState().clearOrganization();
});

describe('route access matrix', () => {
  for (const state of STATES) {
    for (const [guardName, guard] of Object.entries(GUARDS)) {
      const reachable = expectedReachable(state, guardName as GuardName);
      it(`${state.name} → ${guardName} → ${reachable ? 'reachable' : 'blocked'}`, async () => {
        applyState(state);
        const run = guard(ctx);
        if (reachable) {
          await expect(run).resolves.toBeUndefined();
        } else {
          await expect(run).rejects.toBeDefined();
        }
      });
    }
  }
});

/**
 * Route-access matrix (FE-52). Composes the real security gateway for a few
 * representative route policies and asserts, across a matrix of user states
 * (signed-out / limited / read-only member / admin), exactly which routes are
 * reachable. This is the adversarial backstop for authorization: every "blocked"
 * cell proves an unauthorized caller is turned away by the gateway (L1 session →
 * L5 permission), not merely by a hidden nav item.
 */
import { beforeEach, describe, expect, it } from 'vitest';

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
    requirePermissionGate('membership:manage'),
  ),
} as const;

type GuardName = keyof typeof GUARDS;
type Perm = 'membership:read' | 'membership:manage';

interface UserState {
  name: string;
  authed: boolean;
  perms: Perm[];
}

const STATES: UserState[] = [
  { name: 'signed-out', authed: false, perms: [] },
  { name: 'limited (no perms)', authed: true, perms: [] },
  { name: 'member (read-only)', authed: true, perms: ['membership:read'] },
  { name: 'admin', authed: true, perms: ['membership:read', 'membership:manage'] },
];

/** The authoritative expectation, as explicit logic (no dynamic lookup). */
function expectedReachable(state: UserState, guard: GuardName): boolean {
  if (!state.authed) return false; // L1 blocks everyone signed-out
  if (guard === 'authed-only') return true;
  const canRead = state.perms.includes('membership:read'); // L5
  if (guard === 'members:read') return canRead;
  return canRead && state.perms.includes('membership:manage'); // manage also needs L5 manage
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
  useOrganizationStore.setState({ permissions: state.perms });
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

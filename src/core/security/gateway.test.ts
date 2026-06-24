import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { gateway, gatewayFromPolicy } from './gateway.ts';

const ctx = {
  location: { pathname: '/x', search: '', hash: '', href: '/x' },
  params: {},
};

function signIn() {
  useAuthStore.setState({
    user: { id: 'u', email: 'a@b.test', role: 'user' },
    isAuthenticated: true,
  });
}

function setCaps(value: boolean) {
  useOrganizationStore.setState({
    capabilities: {
      canInviteMembers: value,
      canManageMembers: value,
      canManageRoles: value,
      canTransferOwnership: value,
      canDelete: value,
      canManageBilling: value,
    },
  });
}

describe('gateway', () => {
  it('runs gates in order and threads the context', async () => {
    const calls: string[] = [];
    const run = gateway<{ n: number }>(
      (ctx) => {
        calls.push(`a:${ctx.n}`);
      },
      async (ctx) => {
        calls.push(`b:${ctx.n}`);
      },
    );

    await run({ n: 1 });

    expect(calls).toEqual(['a:1', 'b:1']);
  });

  it('short-circuits on the first gate that throws (later gates do not run)', async () => {
    const later = vi.fn();
    const run = gateway<unknown>(() => {
      throw new Error('halt');
    }, later);

    await expect(run({})).rejects.toThrow('halt');
    expect(later).not.toHaveBeenCalled();
  });

  it('rejects when an async gate rejects', async () => {
    const later = vi.fn();
    const run = gateway<unknown>(async () => {
      await Promise.reject(new Error('async-halt'));
    }, later);

    await expect(run({})).rejects.toThrow('async-halt');
    expect(later).not.toHaveBeenCalled();
  });

  it('passes when there are no gates', async () => {
    await expect(gateway<unknown>()({})).resolves.toBeUndefined();
  });
});

describe('gatewayFromPolicy (default-deny)', () => {
  beforeEach(() => {
    useOrganizationStore.getState().clearOrganization();
  });

  it('requires a session even for an empty policy', async () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    await expect(gatewayFromPolicy({})(ctx)).rejects.toBeDefined();
  });

  it('lets an authed user through an empty policy', async () => {
    signIn();
    await expect(gatewayFromPolicy({})(ctx)).resolves.toBeUndefined();
  });

  it('adds the permission gate when the policy names one', async () => {
    signIn();
    useOrganizationStore.setState({ permissions: [] });
    await expect(
      gatewayFromPolicy({ permission: 'membership:read' })(ctx),
    ).rejects.toBeDefined();
    useOrganizationStore.setState({ permissions: ['membership:read'] });
    await expect(
      gatewayFromPolicy({ permission: 'membership:read' })(ctx),
    ).resolves.toBeUndefined();
  });

  it('adds the capability gate when the policy names one', async () => {
    signIn();
    setCaps(false);
    await expect(
      gatewayFromPolicy({ capability: 'canManageMembers' })(ctx),
    ).rejects.toBeDefined();
    setCaps(true);
    await expect(
      gatewayFromPolicy({ capability: 'canManageMembers' })(ctx),
    ).resolves.toBeUndefined();
  });
});

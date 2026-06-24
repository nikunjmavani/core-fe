import { beforeEach, describe, expect, it, vi } from 'vitest';

const useMockApiRef = vi.hoisted(() => ({ value: false }));
vi.mock('@/core/config/env.ts', () => ({
  config: {
    get useMockApi() {
      return useMockApiRef.value;
    },
  },
}));

const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, post: postMock, patch: patchMock, delete: deleteMock },
}));

import {
  createApiKey,
  createRole,
  deleteRole,
  getSubscription,
  listApiKeys,
  listMembers,
  listRoles,
  removeMember,
  revokeApiKey,
  updateMemberRole,
  updateMemberStatus,
  updateSubscriptionPlan,
} from './organization-api.ts';

const TS = '2026-01-01T00:00:00.000Z';

const USR = 'usr_abcdefghij0123456789x';
const ROL = 'rol_abcdefghij0123456789x';
const WIRE_MEMBER = {
  id: 'mem_abcdefghij0123456789x',
  user_id: USR,
  role_id: ROL,
  status: 'ACTIVE',
  joined_at: '2026-01-01T00:00:00.000Z',
  last_active_at: null,
  user: {
    id: USR,
    email: 'ada@acme.test',
    first_name: 'Ada',
    last_name: 'Byron',
    avatar_url: null,
  },
  role: { id: ROL, name: 'Owner' },
};

beforeEach(() => {
  useMockApiRef.value = false;
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  deleteMock.mockReset();
});

describe('organization-api memberships (live)', () => {
  it('maps the membership wire to the flat Member domain shape', async () => {
    getMock.mockResolvedValue({ data: [WIRE_MEMBER] });
    const [member] = await listMembers();
    expect(member).toMatchObject({
      id: 'mem_abcdefghij0123456789x',
      userId: USR,
      name: 'Ada Byron',
      email: 'ada@acme.test',
      role: 'owner',
      status: 'active',
      joinedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(member?.avatarUrl).toBeUndefined();
    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining('/tenancy/organization/memberships'),
    );
  });

  it('falls back to email for a nameless user and buckets custom roles as member', async () => {
    getMock.mockResolvedValue({
      data: [
        {
          ...WIRE_MEMBER,
          user: { ...WIRE_MEMBER.user, first_name: null, last_name: null },
          role: { id: ROL, name: 'Billing Manager' },
        },
      ],
    });
    const [member] = await listMembers();
    expect(member?.name).toBe('ada@acme.test');
    expect(member?.role).toBe('member');
  });

  it('updateMemberRole posts the immutable role_id', async () => {
    patchMock.mockResolvedValue({ data: WIRE_MEMBER });
    await updateMemberRole({ membershipId: 'mem_x', role: 'admin', roleId: ROL });
    expect(patchMock).toHaveBeenCalledWith(
      expect.stringContaining('/memberships/mem_x'),
      {
        role_id: ROL,
      },
    );
  });

  it('updateMemberRole requires a role id in live mode', async () => {
    await expect(
      updateMemberRole({ membershipId: 'mem_x', role: 'admin' }),
    ).rejects.toThrow(/role id is required/i);
  });

  it('updateMemberStatus posts the uppercase status and maps the result', async () => {
    patchMock.mockResolvedValue({ data: { ...WIRE_MEMBER, status: 'SUSPENDED' } });
    const member = await updateMemberStatus({
      membershipId: 'mem_x',
      status: 'suspended',
    });
    expect(patchMock).toHaveBeenCalledWith(
      expect.stringContaining('/memberships/mem_x'),
      {
        status: 'SUSPENDED',
      },
    );
    expect(member.status).toBe('suspended');
  });

  it('removeMember deletes and returns the id', async () => {
    deleteMock.mockResolvedValue({ data: null });
    expect(await removeMember('mem_x')).toEqual({ id: 'mem_x' });
    expect(deleteMock).toHaveBeenCalledWith(
      expect.stringContaining('/memberships/mem_x'),
    );
  });
});

describe('organization-api memberships (mock)', () => {
  it('listMembers returns the in-memory mock members without a network call', async () => {
    useMockApiRef.value = true;
    const members = await listMembers();
    expect(Array.isArray(members)).toBe(true);
    expect(getMock).not.toHaveBeenCalled();
  });
});

const ROLE_WIRE = {
  id: ROL,
  name: 'Admin',
  description: 'Org admins',
  is_system: true,
  permissions: ['membership:manage'],
  member_count: 3,
};

describe('organization-api roles (live)', () => {
  it('maps the role wire to RoleSummary', async () => {
    getMock.mockResolvedValue({ data: [ROLE_WIRE] });
    const [role] = await listRoles();
    expect(role).toMatchObject({
      id: ROL,
      name: 'Admin',
      description: 'Org admins',
      isSystem: true,
      memberCount: 3,
      permissions: ['membership:manage'],
    });
  });

  it('defaults missing permissions / member_count / description', async () => {
    getMock.mockResolvedValue({ data: [{ id: ROL, name: 'Viewer', is_system: true }] });
    const [role] = await listRoles();
    expect(role?.permissions).toEqual([]);
    expect(role?.memberCount).toBe(0);
    expect(role?.description).toBe('');
  });

  it('createRole posts the input and maps the result', async () => {
    postMock.mockResolvedValue({ data: { ...ROLE_WIRE, is_system: false } });
    await createRole({ name: 'X', description: 'd', permissions: ['role:read'] });
    expect(postMock).toHaveBeenCalledWith(expect.stringContaining('/roles'), {
      name: 'X',
      description: 'd',
      permissions: ['role:read'],
    });
  });

  it('deleteRole deletes and returns the id', async () => {
    deleteMock.mockResolvedValue({ data: null });
    expect(await deleteRole('rol_x')).toEqual({ id: 'rol_x' });
    expect(deleteMock).toHaveBeenCalledWith(expect.stringContaining('/roles/rol_x'));
  });
});

const KEY_WIRE = {
  id: 'key_1',
  name: 'CI token',
  prefix: 'core_live_abcd',
  created_at: TS,
  last_used_at: null,
  expires_at: null,
};

describe('organization-api api-keys (live)', () => {
  it('maps the api-key wire to ApiKey', async () => {
    getMock.mockResolvedValue({ data: [KEY_WIRE] });
    const [key] = await listApiKeys();
    expect(key).toMatchObject({
      id: 'key_1',
      name: 'CI token',
      prefix: 'core_live_abcd',
      createdAt: TS,
    });
    expect(key?.expiresAt).toBeUndefined();
  });

  it('createApiKey posts expires_in_days and returns the secret once', async () => {
    postMock.mockResolvedValue({
      data: { ...KEY_WIRE, secret: 'core_live_abcd_secret' },
    });
    const created = await createApiKey({ name: 'CI token', expiresInDays: '30' });
    expect(created.secret).toBe('core_live_abcd_secret');
    expect(postMock).toHaveBeenCalledWith(expect.stringContaining('/api-keys'), {
      name: 'CI token',
      expires_in_days: '30',
    });
  });

  it('revokeApiKey deletes and returns the id', async () => {
    deleteMock.mockResolvedValue({ data: null });
    expect(await revokeApiKey('key_1')).toEqual({ id: 'key_1' });
    expect(deleteMock).toHaveBeenCalledWith(expect.stringContaining('/api-keys/key_1'));
  });
});

const SUB_WIRE = {
  plan: 'pro',
  status: 'active',
  seats: 10,
  seats_used: 4,
  renews_at: TS,
  amount_cents: 9900,
  currency: 'usd',
};

describe('organization-api subscription (live)', () => {
  it('maps the subscription wire to the domain shape', async () => {
    getMock.mockResolvedValue({ data: SUB_WIRE });
    const sub = await getSubscription();
    expect(sub).toMatchObject({
      plan: 'pro',
      status: 'active',
      seats: 10,
      seatsUsed: 4,
      renewsAt: TS,
      amountCents: 9900,
      currency: 'usd',
    });
  });

  it('updateSubscriptionPlan patches the plan', async () => {
    patchMock.mockResolvedValue({ data: { ...SUB_WIRE, plan: 'starter' } });
    const sub = await updateSubscriptionPlan('starter');
    expect(patchMock).toHaveBeenCalledWith(expect.stringContaining('/subscription'), {
      plan: 'starter',
    });
    expect(sub.plan).toBe('starter');
  });
});

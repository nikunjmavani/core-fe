import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock, putMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
    put: putMock,
    patch: patchMock,
    delete: deleteMock,
  },
}));

import {
  createApiKey,
  createRole,
  deleteRole,
  inviteMember,
  listApiKeys,
  listMembers,
  listRoles,
  removeMember,
  revokeApiKey,
  updateMemberRole,
  updateMemberStatus,
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
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  patchMock.mockReset();
  deleteMock.mockReset();
});

describe('organization-api memberships (live)', () => {
  it('maps the membership wire to the flat Member domain shape', async () => {
    getMock.mockResolvedValue({ data: [WIRE_MEMBER] });
    const { rows } = await listMembers();
    const [member] = rows;
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

  it('windows the list: forwards q + limit and surfaces the keyset cursor', async () => {
    getMock.mockResolvedValue({
      data: [WIRE_MEMBER],
      meta: { pagination: { has_more: true, next: 'cur_1', per_page: 25 } },
    });
    const page = await listMembers({ q: 'ada' });
    expect(page.rows).toHaveLength(1);
    expect(page.next).toBe('cur_1');
    expect(page.hasMore).toBe(true);
    const url = getMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('q=ada');
    expect(url).toContain('limit=25');
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
    const [member] = (await listMembers()).rows;
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

  it('updateMemberRole requires a role id', async () => {
    await expect(
      updateMemberRole({ membershipId: 'mem_x', role: 'admin' }),
    ).rejects.toMatchObject({ code: 'MEMBER_ROLE_REQUIRED' });
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

  it('inviteMember posts email + role_id to /memberships (not /invitations)', async () => {
    // Regression: the old createInvitation hit a non-existent /invitations
    // endpoint (404). core-be adds an INVITED member via POST /memberships.
    postMock.mockResolvedValue({
      data: { ...WIRE_MEMBER, status: 'INVITED', joined_at: null },
    });
    const member = await inviteMember({ email: 'new@acme.test', roleId: ROL });
    expect(postMock).toHaveBeenCalledWith(expect.stringContaining('/memberships'), {
      email: 'new@acme.test',
      role_id: ROL,
    });
    expect(postMock.mock.calls[0]?.[0]).not.toContain('/invitations');
    expect(member.status).toBe('invited');
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
    const [role] = (await listRoles()).rows;
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
    const [role] = (await listRoles()).rows;
    expect(role?.permissions).toEqual([]);
    expect(role?.memberCount).toBe(0);
    expect(role?.description).toBe('');
  });

  it('createRole POSTs name+description then PUTs permission_codes (two-step)', async () => {
    // Regression: core-be's create body is `.strict()` and rejects `permissions`
    // (400). Permissions are applied via PUT /roles/:id/permissions.
    postMock.mockResolvedValue({ data: { ...ROLE_WIRE, is_system: false } });
    putMock.mockResolvedValue({ data: null });
    const role = await createRole({
      name: 'X',
      description: 'd',
      permissions: ['role:read'],
    });
    expect(postMock).toHaveBeenCalledWith(expect.stringContaining('/roles'), {
      name: 'X',
      description: 'd',
    });
    expect(putMock).toHaveBeenCalledWith(
      expect.stringContaining(`/roles/${ROL}/permissions`),
      { permission_codes: ['role:read'] },
    );
    expect(role.permissions).toEqual(['role:read']);
  });

  it('createRole skips the permissions PUT when none are selected', async () => {
    postMock.mockResolvedValue({ data: { ...ROLE_WIRE, is_system: false } });
    await createRole({ name: 'X', description: 'd', permissions: [] });
    expect(putMock).not.toHaveBeenCalled();
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
    const [key] = (await listApiKeys()).rows;
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

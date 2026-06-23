import { beforeEach, describe, expect, it, vi } from 'vitest';

const useMockApiRef = vi.hoisted(() => ({ value: false }));
vi.mock('@/core/config/env.ts', () => ({
  config: {
    get useMockApi() {
      return useMockApiRef.value;
    },
  },
}));

const { getMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, patch: patchMock, delete: deleteMock },
}));

import {
  listMembers,
  removeMember,
  updateMemberRole,
  updateMemberStatus,
} from './organization-api.ts';

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

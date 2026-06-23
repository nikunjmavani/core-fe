import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/core/http/queryClient.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { type MeContext, meContextQueryKey } from './me-context.ts';

const useMockApiRef = vi.hoisted(() => ({ value: false }));
vi.mock('@/core/config/env.ts', () => ({
  config: {
    get useMockApi() {
      return useMockApiRef.value;
    },
    apiBaseUrl: '',
  },
}));

const { postMock, setAccessTokenMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  setAccessTokenMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({ apiClient: { post: postMock } }));
vi.mock('@/shared/auth/token.ts', () => ({ setAccessToken: setAccessTokenMock }));
vi.mock('@/shared/auth/refresh-timer.ts', () => ({ scheduleTokenRefresh: vi.fn() }));

import { switchToOrganization, switchToPersonal } from './switch.ts';

const TEAM_ID = 'org_abcdefghij0123456789x';
const PERSONAL_ID = 'org_personalij0123456789x';
const TS = '2026-01-01T00:00:00.000Z';

const TEAM_CAPS = {
  canInviteMembers: true,
  canManageMembers: true,
  canManageRoles: true,
  canTransferOwnership: true,
  canDelete: true,
  canManageBilling: true,
};
const PERSONAL_CAPS = {
  canInviteMembers: false,
  canManageMembers: false,
  canManageRoles: false,
  canTransferOwnership: false,
  canDelete: false,
  canManageBilling: false,
};

const BASE_CTX: MeContext = {
  user: {
    id: 'usr_abcdefghij0123456789x',
    email: 'ada@acme.test',
    isEmailVerified: true,
    isMfaEnabled: false,
    firstName: 'Ada',
    lastName: null,
    avatarUrl: null,
    status: 'ACTIVE',
    createdAt: TS,
    updatedAt: TS,
  },
  activeOrganization: {
    id: TEAM_ID,
    name: 'Acme',
    slug: 'acme',
    type: 'TEAM',
    status: 'ACTIVE',
    logoUrl: null,
    capabilities: TEAM_CAPS,
    createdAt: TS,
    updatedAt: TS,
  },
  myPermissions: ['membership:manage'],
  globalRole: null,
  organizations: [
    {
      id: TEAM_ID,
      name: 'Acme',
      slug: 'acme',
      type: 'TEAM',
      status: 'ACTIVE',
      logoUrl: null,
      capabilities: TEAM_CAPS,
      createdAt: TS,
      updatedAt: TS,
      isActive: true,
    },
    {
      id: PERSONAL_ID,
      name: 'Personal',
      slug: null,
      type: 'PERSONAL',
      status: 'ACTIVE',
      logoUrl: null,
      capabilities: PERSONAL_CAPS,
      createdAt: TS,
      updatedAt: TS,
      isActive: false,
    },
  ],
};

const PERSONAL_WIRE = {
  id: PERSONAL_ID,
  name: 'Personal',
  slug: null,
  type: 'PERSONAL',
  status: 'ACTIVE',
  logo_url: null,
  capabilities: {
    can_invite_members: false,
    can_manage_members: false,
    can_manage_roles: false,
    can_transfer_ownership: false,
    can_delete: false,
    can_manage_billing: false,
  },
  created_at: TS,
  updated_at: TS,
};

beforeEach(() => {
  useMockApiRef.value = false;
  postMock.mockReset();
  setAccessTokenMock.mockReset();
  useOrganizationStore.getState().clearOrganization();
  queryClient.setQueryData(meContextQueryKey, structuredClone(BASE_CTX));
});

afterEach(() => {
  queryClient.clear();
});

describe('tenancy/switch', () => {
  it('re-mints the token + applies the inline delta (live switch-to-personal)', async () => {
    postMock.mockResolvedValue({
      data: {
        access_token: 'new_tok',
        active_organization: PERSONAL_WIRE,
        my_permissions: ['organization:read'],
        global_role: null,
      },
    });

    const result = await switchToPersonal();

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/switch-to-personal'),
      {},
    );
    expect(setAccessTokenMock).toHaveBeenCalledWith('new_tok');
    expect(result?.activeOrganization?.id).toBe(PERSONAL_ID);
    expect(result?.myPermissions).toEqual(['organization:read']);
    expect(result?.organizations.find((o) => o.id === PERSONAL_ID)?.isActive).toBe(true);
    expect(result?.organizations.find((o) => o.id === TEAM_ID)?.isActive).toBe(false);
    // user + org list are stable across a switch
    expect(result?.user.email).toBe('ada@acme.test');
    expect(result?.organizations).toHaveLength(2);
    // org store is derived from the switched context
    expect(useOrganizationStore.getState().organizationType).toBe('PERSONAL');
    expect(useOrganizationStore.getState().organizationId).toBe(PERSONAL_ID);
  });

  it('posts the immutable org id on switch-to-organization (live)', async () => {
    postMock.mockResolvedValue({
      data: {
        access_token: 't2',
        active_organization: { ...PERSONAL_WIRE, id: TEAM_ID },
        my_permissions: [],
        global_role: null,
      },
    });

    await switchToOrganization(TEAM_ID);

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/switch-to-organization'),
      { organization_id: TEAM_ID },
    );
  });

  it('flips the active org locally in mock mode (no network)', async () => {
    useMockApiRef.value = true;

    const result = await switchToPersonal();

    expect(postMock).not.toHaveBeenCalled();
    expect(result?.activeOrganization?.type).toBe('PERSONAL');
    expect(result?.organizations.find((o) => o.type === 'PERSONAL')?.isActive).toBe(true);
  });
});

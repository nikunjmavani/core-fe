import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/core/http/queryClient.ts';
import { billingQueryKeys } from '@/shared/api/billing-query-keys.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { type MeContext, meContextQueryKey } from './me-context.ts';

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
      createdAt: TS,
      updatedAt: TS,
      isActive: false,
    },
  ],
  deploymentFlags: { personalOrganizations: true, teamOrganizations: true },
  personalOrganizationId: PERSONAL_ID,
};

const PERSONAL_WIRE = {
  id: PERSONAL_ID,
  name: 'Personal',
  slug: null,
  type: 'PERSONAL',
  status: 'ACTIVE',
  logo_url: null,
  created_at: TS,
  updated_at: TS,
};

beforeEach(() => {
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

  it('keeps each org cache isolated and intact across a switch (#4 — instant switch-back)', async () => {
    // Seed the org we are leaving. Keys carry the org id, so they belong to it
    // alone and must SURVIVE the switch — that is what makes switching back
    // instant. The new org reads a different (here empty) key.
    queryClient.setQueryData(orgQueryKeys.members(TEAM_ID), [{ id: 'm_team' }]);
    queryClient.setQueryData(billingQueryKeys.activeSubscription(TEAM_ID), {
      id: 'sub_team',
    });

    postMock.mockResolvedValue({
      data: {
        access_token: 't3',
        active_organization: PERSONAL_WIRE,
        my_permissions: [],
        global_role: null,
      },
    });

    await switchToPersonal();

    // The left org's data is NOT purged — switching back serves it from cache.
    expect(queryClient.getQueryData(orgQueryKeys.members(TEAM_ID))).toEqual([
      { id: 'm_team' },
    ]);
    expect(
      queryClient.getQueryData(billingQueryKeys.activeSubscription(TEAM_ID)),
    ).toEqual({ id: 'sub_team' });
    // The new scope is a structurally distinct key — no cross-tenant bleed.
    expect(queryClient.getQueryData(orgQueryKeys.members(PERSONAL_ID))).toBeUndefined();
    // me-context is still updated by the switch.
    expect(queryClient.getQueryData(meContextQueryKey)).toBeDefined();
  });

  it('never lets two tenants share a cache entry (structural key isolation)', async () => {
    queryClient.setQueryData(orgQueryKeys.members('org_a'), [{ id: 'a' }]);
    queryClient.setQueryData(orgQueryKeys.members('org_b'), [{ id: 'b' }]);

    postMock.mockResolvedValue({
      data: {
        access_token: 't4',
        active_organization: { ...PERSONAL_WIRE, id: TEAM_ID },
        my_permissions: [],
        global_role: null,
      },
    });

    await switchToOrganization(TEAM_ID);

    // Each org keeps its own rows regardless of the active org.
    expect(queryClient.getQueryData(orgQueryKeys.members('org_a'))).toEqual([
      { id: 'a' },
    ]);
    expect(queryClient.getQueryData(orgQueryKeys.members('org_b'))).toEqual([
      { id: 'b' },
    ]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/core/http/queryClient.ts';
import { getMyPermissions } from '@/shared/api/organization-api.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { type MeContext, meContextQueryKey } from './me-context.ts';
import type * as MyOrganizationsModule from './my-organizations.ts';
import { listMyOrganizations } from './my-organizations.ts';
import {
  ensurePermissionsFor,
  findMembership,
  findMembershipBySlug,
  resetPermissionCacheForTests,
} from './organization-membership.ts';

vi.mock('@/shared/api/organization-api.ts', () => ({
  getMyPermissions: vi.fn().mockResolvedValue(['organization:read']),
}));

vi.mock('./my-organizations.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof MyOrganizationsModule>();
  return {
    ...actual,
    listMyOrganizations: vi
      .fn()
      .mockResolvedValue([{ id: 'org_acme', name: 'Acme Inc.', slug: 'acme' }]),
  };
});

describe('findMembership', () => {
  it('returns the organization when the user is a member', async () => {
    await expect(findMembership('org_acme')).resolves.toEqual({
      id: 'org_acme',
      name: 'Acme Inc.',
      slug: 'acme',
    });
  });

  it('returns null for organizations the user does not belong to', async () => {
    await expect(findMembership('org_unknown')).resolves.toBeNull();
  });
});

describe('findMembershipBySlug (team URL resolution, FE-22)', () => {
  afterEach(() => {
    queryClient.removeQueries({ queryKey: meContextQueryKey });
  });

  it('resolves a slug to the canonical org when the user is a member', async () => {
    await expect(findMembershipBySlug('acme')).resolves.toEqual({
      id: 'org_acme',
      name: 'Acme Inc.',
      slug: 'acme',
    });
  });

  it('resolves from the warm me/context cache without a list call (happy path)', async () => {
    vi.mocked(listMyOrganizations).mockClear();
    queryClient.setQueryData(meContextQueryKey, {
      organizations: [
        {
          id: 'org_acme',
          name: 'Acme Inc.',
          slug: 'acme',
          type: 'TEAM',
          status: 'ACTIVE',
          logoUrl: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          isActive: true,
        },
      ],
    } as MeContext);

    await expect(findMembershipBySlug('acme')).resolves.toMatchObject({
      id: 'org_acme',
      slug: 'acme',
    });
    // Cache-first: the parent already fetched me/context, so no extra round-trip.
    expect(listMyOrganizations).not.toHaveBeenCalled();
  });

  it('returns null for an unknown slug (existence never leaked → 404)', async () => {
    await expect(findMembershipBySlug('ghost')).resolves.toBeNull();
  });

  it('falls back to cached me/context when the list API lags after onboarding', async () => {
    vi.mocked(listMyOrganizations).mockResolvedValueOnce([]);
    queryClient.setQueryData(meContextQueryKey, {
      organizations: [
        {
          id: 'org_new',
          name: 'New Co',
          slug: 'new-co',
          type: 'TEAM',
          status: 'ACTIVE',
          logoUrl: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          isActive: true,
        },
      ],
    } as MeContext);

    await expect(findMembershipBySlug('new-co')).resolves.toMatchObject({
      id: 'org_new',
      slug: 'new-co',
    });
  });
});

describe('ensurePermissionsFor (per-organization refetch)', () => {
  beforeEach(() => {
    resetPermissionCacheForTests();
    useOrganizationStore.getState().clearOrganization();
    vi.mocked(getMyPermissions).mockClear();
  });

  it('loads permissions on first call', async () => {
    await ensurePermissionsFor('org_acme');
    expect(getMyPermissions).toHaveBeenCalledTimes(1);
    expect(useOrganizationStore.getState().permissions).toEqual(['organization:read']);
  });

  it('does not refetch for the same organization', async () => {
    await ensurePermissionsFor('org_acme');
    await ensurePermissionsFor('org_acme');
    expect(getMyPermissions).toHaveBeenCalledTimes(1);
  });

  it('refetches when the organization changes — org A permissions never leak into org B', async () => {
    await ensurePermissionsFor('org_acme');
    await ensurePermissionsFor('org_globex');
    expect(getMyPermissions).toHaveBeenCalledTimes(2);
  });
});

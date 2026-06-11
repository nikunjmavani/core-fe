import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMyPermissions } from '@/shared/api/organization-api.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import {
  ensurePermissionsFor,
  findMembership,
  resetPermissionCacheForTests,
} from './organization-membership.ts';

vi.mock('@/shared/api/organization-api.ts', () => ({
  getMyPermissions: vi.fn().mockResolvedValue(['organization:read']),
}));

vi.mock('./my-organizations.ts', () => ({
  listMyOrganizations: vi
    .fn()
    .mockResolvedValue([{ id: 'org_acme', name: 'Acme Inc.', slug: 'acme' }]),
}));

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

import { isNotFound } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { resetPermissionCacheForTests } from '@/shared/tenancy/organization-membership.ts';

import {
  requireActiveOrganization,
  requireFeature,
  requireOrganizationContext,
} from './route-guards.ts';

vi.mock('@/shared/tenancy/my-organizations.ts', () => ({
  listMyOrganizations: vi
    .fn()
    .mockResolvedValue([{ id: 'org_acme', name: 'Acme Inc.', slug: 'acme' }]),
}));

vi.mock('@/shared/api/organization-api.ts', () => ({
  getMyPermissions: vi.fn().mockResolvedValue(['organization:read']),
}));

describe('requireOrganizationContext', () => {
  beforeEach(() => {
    resetPermissionCacheForTests();
    useOrganizationStore.getState().clearOrganization();
    localStorage.clear();
  });

  it('throws notFound for a malformed slug — no fetch, no existence leak', async () => {
    await expect(requireOrganizationContext('NOT-A-SLUG')).rejects.toSatisfy(isNotFound);
  });

  it('throws notFound when the user is not a member of the organization', async () => {
    await expect(requireOrganizationContext('stranger')).rejects.toSatisfy(isNotFound);
  });

  it('syncs the derived store from the URL and loads permissions for members', async () => {
    const organization = await requireOrganizationContext('acme');

    expect(organization.slug).toBe('acme');
    expect(useOrganizationStore.getState().organizationId).toBe('org_acme');
    expect(useOrganizationStore.getState().organizationSlug).toBe('acme');
    expect(useOrganizationStore.getState().permissions).toEqual(['organization:read']);
  });
});

describe('requireActiveOrganization', () => {
  it('passes for active organizations (mock mode: always active)', () => {
    expect(() => requireActiveOrganization('acme')).not.toThrow();
  });
});

describe('requireFeature', () => {
  it('allows everything in mock mode (REPLACE_WITH_API)', () => {
    expect(() => requireFeature('patients')).not.toThrow();
  });
});

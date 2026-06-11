import { beforeEach, describe, expect, it } from 'vitest';

import {
  getLastOrganizationFromStorage,
  useOrganizationStore,
} from '@/shared/store/useOrganizationStore/index.ts';

import {
  getActiveOrganizationId,
  syncOrganizationFromRoute,
} from './organization-context.ts';

describe('organization context (URL → derived store)', () => {
  beforeEach(() => {
    useOrganizationStore.getState().clearOrganization();
    localStorage.clear();
  });

  it('syncs the store from the route param and persists last-used', () => {
    syncOrganizationFromRoute('org_acme', 'acme');

    expect(useOrganizationStore.getState().organizationId).toBe('org_acme');
    expect(useOrganizationStore.getState().organizationSlug).toBe('acme');
    expect(getLastOrganizationFromStorage()).toEqual({ id: 'org_acme', slug: 'acme' });
  });

  it('does not reset the store when the organization is unchanged', () => {
    syncOrganizationFromRoute('org_acme', 'acme');
    useOrganizationStore.getState().setPermissions(['organization:read']);

    syncOrganizationFromRoute('org_acme', 'acme');

    // Same organization → permissions survive (no spurious setOrganization).
    expect(useOrganizationStore.getState().permissions).toEqual(['organization:read']);
  });

  it('getActiveOrganizationId reads the derived cache', () => {
    expect(getActiveOrganizationId()).toBeNull();
    syncOrganizationFromRoute('org_globex', 'globex');
    expect(getActiveOrganizationId()).toBe('org_globex');
  });
});

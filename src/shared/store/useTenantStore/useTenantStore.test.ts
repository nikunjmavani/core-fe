import { afterEach, describe, expect, it } from 'vitest';

import {
  getLastTenantFromStorage,
  persistTenantToStorage,
  useTenantStore,
} from './useTenantStore.ts';

const STORAGE_KEY = 'core-last-tenant';

describe('tenant store storage helpers', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    useTenantStore.getState().clearTenant();
  });

  it('getLastTenantFromStorage returns null when empty', () => {
    expect(getLastTenantFromStorage()).toBeNull();
  });

  it('persistTenantToStorage and getLastTenantFromStorage round-trip', () => {
    persistTenantToStorage('org-1', 'acme');
    expect(getLastTenantFromStorage()).toEqual({ id: 'org-1', slug: 'acme' });
  });

  it('getLastTenantFromStorage returns null for invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(getLastTenantFromStorage()).toBeNull();
  });

  it('getLastTenantFromStorage returns null for wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(getLastTenantFromStorage()).toBeNull();
  });
});

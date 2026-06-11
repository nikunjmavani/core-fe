import { afterEach, describe, expect, it } from 'vitest';

import {
  getLastOrganizationFromStorage,
  persistOrganizationToStorage,
  useOrganizationStore,
} from './useOrganizationStore.ts';

const STORAGE_KEY = 'core-last-organization';

describe('organization store storage helpers', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    useOrganizationStore.getState().clearOrganization();
  });

  it('getLastOrganizationFromStorage returns null when empty', () => {
    expect(getLastOrganizationFromStorage()).toBeNull();
  });

  it('persistOrganizationToStorage and getLastOrganizationFromStorage round-trip', () => {
    persistOrganizationToStorage('org-1', 'acme');
    expect(getLastOrganizationFromStorage()).toEqual({ id: 'org-1', slug: 'acme' });
  });

  it('getLastOrganizationFromStorage returns null for invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(getLastOrganizationFromStorage()).toBeNull();
  });

  it('getLastOrganizationFromStorage returns null for wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(getLastOrganizationFromStorage()).toBeNull();
  });
});

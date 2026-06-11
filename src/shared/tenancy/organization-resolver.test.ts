import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  persistOrganizationToStorage,
  useOrganizationStore,
} from '@/shared/store/useOrganizationStore/index.ts';

import { listMyOrganizations } from './my-organizations.ts';
import { resolveRootRedirect } from './organization-resolver.ts';

vi.mock('./my-organizations.ts', () => ({
  listMyOrganizations: vi.fn(),
}));

const ORGS = [
  { id: 'org_acme', name: 'Acme Inc.', slug: 'acme' },
  { id: 'org_globex', name: 'Globex', slug: 'globex' },
];

describe('resolveRootRedirect (`/` keeps no UI)', () => {
  beforeEach(() => {
    localStorage.clear();
    useOrganizationStore.getState().clearOrganization();
    vi.mocked(listMyOrganizations).mockResolvedValue(ORGS);
  });

  it('redirects to onboarding when the user has no organizations', async () => {
    vi.mocked(listMyOrganizations).mockResolvedValue([]);
    await expect(resolveRootRedirect()).resolves.toEqual({ to: '/onboarding' });
  });

  it('redirects to the last-used organization dashboard when still a member', async () => {
    persistOrganizationToStorage('org_globex', 'globex');
    await expect(resolveRootRedirect()).resolves.toEqual({
      to: '/organization/$organizationId/dashboard',
      params: { organizationId: 'org_globex' },
    });
  });

  it('falls back to the picker when the last-used organization is stale', async () => {
    persistOrganizationToStorage('org_gone', 'gone');
    await expect(resolveRootRedirect()).resolves.toEqual({ to: '/organization' });
  });

  it('falls back to the picker when no last-used organization exists', async () => {
    await expect(resolveRootRedirect()).resolves.toEqual({ to: '/organization' });
  });
});

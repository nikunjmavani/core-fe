import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  persistOrganizationToStorage,
  useOrganizationStore,
} from '@/shared/store/useOrganizationStore/index.ts';

import type { MeContext, OrganizationType } from './me-context.ts';
import { listMyOrganizations } from './my-organizations.ts';
import { resolveRootRedirect, resolveRootTarget } from './organization-resolver.ts';

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

function meCtx(activeOrganization: MeContext['activeOrganization']): MeContext {
  return {
    user: {
      id: 'usr_1',
      email: 'a@b.test',
      isEmailVerified: true,
      isMfaEnabled: false,
      firstName: 'A',
      lastName: null,
      avatarUrl: null,
      status: 'ACTIVE',
      createdAt: 't',
      updatedAt: 't',
    },
    activeOrganization,
    myPermissions: [],
    globalRole: null,
    organizations: [],
  };
}

function activeOrg(type: OrganizationType, slug: string | null) {
  return {
    id: 'org_x',
    name: 'X',
    slug,
    type,
    status: 'ACTIVE' as const,
    logoUrl: null,
    capabilities: {
      canInviteMembers: false,
      canManageMembers: false,
      canManageRoles: false,
      canTransferOwnership: false,
      canDelete: false,
      canManageBilling: false,
    },
    createdAt: 't',
    updatedAt: 't',
  };
}

describe('resolveRootTarget (dual-URL `/` decision)', () => {
  it('routes to onboarding when there is no active org', () => {
    expect(resolveRootTarget(meCtx(null))).toEqual({ to: '/onboarding' });
  });

  it('routes a personal org to the root /dashboard', () => {
    expect(resolveRootTarget(meCtx(activeOrg('PERSONAL', null)))).toEqual({
      to: '/dashboard',
    });
  });

  it('routes a team org to its slug space', () => {
    expect(resolveRootTarget(meCtx(activeOrg('TEAM', 'acme')))).toEqual({
      to: '/organization/$organizationSlug/dashboard',
      params: { organizationSlug: 'acme' },
    });
  });

  it('routes a slugless team to onboarding (backend invariant violation)', () => {
    expect(resolveRootTarget(meCtx(activeOrg('TEAM', null)))).toEqual({
      to: '/onboarding',
    });
  });
});

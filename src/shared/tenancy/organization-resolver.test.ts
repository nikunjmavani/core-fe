import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MeContext, OrganizationType } from './me-context.ts';
import { fetchMeContext } from './me-context.ts';
import { resolveRootRedirect, resolveRootTarget } from './organization-resolver.ts';

vi.mock('./me-context.ts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, fetchMeContext: vi.fn() };
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
    createdAt: 't',
    updatedAt: 't',
  };
}

describe('resolveRootRedirect (`/` → active org from me/context)', () => {
  beforeEach(() => {
    vi.mocked(fetchMeContext).mockReset();
  });

  it('redirects to onboarding when there is no active org', async () => {
    vi.mocked(fetchMeContext).mockResolvedValue(meCtx(null));
    await expect(resolveRootRedirect()).resolves.toEqual({ to: '/onboarding' });
  });

  it('routes a personal active org to the root /dashboard', async () => {
    vi.mocked(fetchMeContext).mockResolvedValue(meCtx(activeOrg('PERSONAL', null)));
    await expect(resolveRootRedirect()).resolves.toEqual({ to: '/dashboard' });
  });

  it('routes a team active org to its $organizationSlug dashboard', async () => {
    vi.mocked(fetchMeContext).mockResolvedValue(meCtx(activeOrg('TEAM', 'acme')));
    await expect(resolveRootRedirect()).resolves.toEqual({
      to: '/organization/$organizationSlug/dashboard',
      params: { organizationSlug: 'acme' },
    });
  });

  it('routes a team active org WITHOUT a slug to onboarding (invariant violation)', async () => {
    vi.mocked(fetchMeContext).mockResolvedValue(meCtx(activeOrg('TEAM', null)));
    await expect(resolveRootRedirect()).resolves.toEqual({ to: '/onboarding' });
  });
});

describe('resolveRootTarget (dual-URL `/` decision — slug variant)', () => {
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

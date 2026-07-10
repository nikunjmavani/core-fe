import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/core/http/queryClient.ts';
import type * as MeContextModule from '@/shared/tenancy/me-context.ts';
import { meContextQueryKey } from '@/shared/tenancy/me-context.ts';

import {
  ensureSessionContext,
  hydrateSessionContext,
  invalidateSessionContext,
  resetSessionContextForTests,
} from './session-context.ts';

vi.mock('./me-context.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof MeContextModule>();
  return {
    ...actual,
    fetchMeContext: vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'a@b.test', firstName: 'A', lastName: 'B' },
      organizations: [],
      activeOrganization: null,
      myPermissions: [],
      globalRole: 'user',
      deploymentFlags: { personalOrganizations: true, teamOrganizations: true },
    }),
  };
});

import { fetchMeContext } from './me-context.ts';

describe('session-context', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(fetchMeContext).mockClear();
  });

  it('hydrateSessionContext fetches and caches me/context', async () => {
    const ctx = await hydrateSessionContext();
    expect(ctx.user.id).toBe('u1');
    expect(queryClient.getQueryData(meContextQueryKey)).toEqual(ctx);
    expect(fetchMeContext).toHaveBeenCalledOnce();
  });

  it('invalidateSessionContext removes the cache entry', async () => {
    await hydrateSessionContext();
    invalidateSessionContext();
    expect(queryClient.getQueryData(meContextQueryKey)).toBeUndefined();
  });

  it('resetSessionContextForTests clears cache', async () => {
    await hydrateSessionContext();
    resetSessionContextForTests();
    expect(queryClient.getQueryData(meContextQueryKey)).toBeUndefined();
  });

  // Regression: the post-auth guard chain must reuse the me/context that
  // establishSession just cached instead of refetching — a redundant fetch keeps
  // the login form mounted during the destination route's beforeLoad ("flash of
  // login" between the OTP code and the dashboard).
  it('ensureSessionContext returns the cached context WITHOUT refetching', async () => {
    await hydrateSessionContext(); // establishSession-style seed
    vi.mocked(fetchMeContext).mockClear();

    const ctx = await ensureSessionContext();

    expect(ctx.user.id).toBe('u1');
    expect(fetchMeContext).not.toHaveBeenCalled();
  });

  it('ensureSessionContext fetches once when the cache is empty (cold boot)', async () => {
    expect(queryClient.getQueryData(meContextQueryKey)).toBeUndefined();

    const ctx = await ensureSessionContext();

    expect(ctx.user.id).toBe('u1');
    expect(fetchMeContext).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(meContextQueryKey)).toEqual(ctx);
  });
});

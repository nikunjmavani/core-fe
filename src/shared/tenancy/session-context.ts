import { queryClient } from '@/core/http/queryClient.ts';

import { fetchMeContext, type MeContext, meContextQueryKey } from './me-context.ts';
import { deriveOrgContext } from './organization-context.ts';
import { resetPermissionCacheForTests } from './organization-membership.ts';

/**
 * Drop cached `me/context` so the next read refetches from the API. Call after
 * logout, org switch side-effects that bypass the switch endpoint, or any
 * mutation that changes session context server-side.
 */
export function invalidateSessionContext(): void {
  queryClient.removeQueries({ queryKey: meContextQueryKey });
}

/**
 * Load the authoritative session context and seed the React Query cache +
 * derived org store — shared by `/` resolution, workspace guards, and auth
 * bootstrap.
 */
export async function hydrateSessionContext(): Promise<MeContext> {
  const ctx = await fetchMeContext();
  queryClient.setQueryData(meContextQueryKey, ctx);
  deriveOrgContext(ctx);
  return ctx;
}

/** Test-only: clear session cache and permission tracking. */
export function resetSessionContextForTests(): void {
  invalidateSessionContext();
  resetPermissionCacheForTests();
}

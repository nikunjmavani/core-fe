import { useQuery } from '@tanstack/react-query';

import { fetchMeContext } from '@/shared/tenancy/me-context.ts';

/** Query key for the caller's session context. */
export const meContextQueryKey = ['auth', 'me-context'] as const;

/**
 * The caller's session context — user, active organization (+ status +
 * capabilities), resolved permissions, global role, and the org-switcher list
 * (`GET /auth/me/context`). Server state via TanStack Query; never mirrored
 * into Zustand. Powers the dashboard today; nav/RBAC/settings later.
 */
export function useMeContext() {
  return useQuery({
    queryKey: meContextQueryKey,
    queryFn: fetchMeContext,
    staleTime: 60_000,
  });
}

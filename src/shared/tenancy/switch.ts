import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { queryClient } from '@/core/http/queryClient.ts';
import { scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { setAccessToken } from '@/shared/auth/token.ts';

import {
  type GlobalRole,
  type MeContext,
  meContextQueryKey,
  type OrganizationSummary,
  organizationWire,
  toOrganization,
} from './me-context.ts';

/**
 * Active-org switch response `data` (snake_case). Switching **re-mints the access
 * token** (the new `org` claim is what authorizes subsequent calls) and returns
 * the active-org delta inline, so the FE never needs a follow-up `/me/context`.
 */
const switchWire = z.object({
  access_token: z.string().min(1),
  active_organization: organizationWire.nullable(),
  my_permissions: z.array(z.string()),
  global_role: z.enum(['super_admin', 'admin', 'user']).nullable(),
});

/**
 * Apply an active-org delta to the cached me/context: swap the active org, its
 * resolved permissions, and flip the `isActive` flag across the switcher list.
 * `user` + the org list are stable across a switch, so they are preserved.
 */
function applyActiveOrg(
  active: OrganizationSummary | null,
  permissions: string[],
  globalRole: GlobalRole | null,
): MeContext | undefined {
  return queryClient.setQueryData<MeContext>(meContextQueryKey, (prev) =>
    prev
      ? {
          ...prev,
          activeOrganization: active,
          myPermissions: permissions,
          globalRole: globalRole ?? prev.globalRole,
          organizations: prev.organizations.map((o) => ({
            ...o,
            isActive: !!active && o.id === active.id,
          })),
        }
      : prev,
  );
}

/** Mock switch: flip the active org locally from the cached switcher list. */
function mockSwitch(match: (o: OrganizationSummary) => boolean): MeContext | undefined {
  const prev = queryClient.getQueryData<MeContext>(meContextQueryKey);
  const target = prev?.organizations.find(match) ?? null;
  return applyActiveOrg(target, prev?.myPermissions ?? [], prev?.globalRole ?? null);
}

async function liveSwitch(
  path: string,
  body: Record<string, unknown>,
): Promise<MeContext | undefined> {
  const res = await apiClient.post<unknown>(`${API_BASE_PATH}${path}`, body);
  const wire = switchWire.parse(res.data);
  setAccessToken(wire.access_token);
  scheduleTokenRefresh();
  return applyActiveOrg(
    wire.active_organization ? toOrganization(wire.active_organization) : null,
    wire.my_permissions,
    wire.global_role,
  );
}

/** Switch the active organization to a team (by immutable id). */
export async function switchToOrganization(
  organizationId: string,
): Promise<MeContext | undefined> {
  if (config.useMockApi) return mockSwitch((o) => o.id === organizationId);
  return liveSwitch('/auth/switch-to-organization', { organization_id: organizationId });
}

/** Switch the active organization to the caller's personal org. */
export async function switchToPersonal(): Promise<MeContext | undefined> {
  if (config.useMockApi) return mockSwitch((o) => o.type === 'PERSONAL');
  return liveSwitch('/auth/switch-to-personal', {});
}

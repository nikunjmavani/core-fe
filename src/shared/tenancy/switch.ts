import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { queryClient } from '@/core/http/queryClient.ts';
import { ANALYTICS_EVENTS } from '@/shared/analytics/analytics.constants.ts';
import { captureAnalyticsEvent } from '@/shared/analytics/capture.ts';
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
import { deriveOrgContext } from './organization-context.ts';

const switchWire = z.object({
  access_token: z.string().min(1),
  active_organization: organizationWire.nullable(),
  my_permissions: z.array(z.string()),
  global_role: z.enum(['super_admin', 'admin', 'user']).nullable(),
});

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

/**
 * Org isolation is now structural: every org-scoped query key carries the
 * active organization id (`['organization', orgId, …]`, `['org', orgId, …]`,
 * `['billing', 'org', orgId, …]`), so two tenants can never share a cache
 * entry and there is nothing to purge on a switch. Dropping the old
 * `removeQueries` purge also makes switching *back* to a recently-visited org
 * instant — its cache is served immediately and `staleTime` governs any
 * background refetch, instead of forcing a cold reload every time. Access is
 * still re-validated by the org guard chain on entry, so a serving a brief
 * cached view of an org the user belongs to is safe.
 */
export async function switchToOrganization(
  organizationId: string,
): Promise<MeContext | undefined> {
  const result = await liveSwitch('/auth/switch-to-organization', {
    organization_id: organizationId,
  });
  if (result) {
    deriveOrgContext(result);
    captureAnalyticsEvent(ANALYTICS_EVENTS.organizationSwitched, {
      target_organization_id: organizationId,
      target_type: result.activeOrganization?.type ?? null,
      switch_target: 'organization',
    });
  }
  return result;
}

export async function switchToPersonal(): Promise<MeContext | undefined> {
  const result = await liveSwitch('/auth/switch-to-personal', {});
  if (result) {
    deriveOrgContext(result);
    captureAnalyticsEvent(ANALYTICS_EVENTS.organizationSwitched, {
      target_type: result.activeOrganization?.type ?? 'PERSONAL',
      switch_target: 'personal',
    });
  }
  return result;
}

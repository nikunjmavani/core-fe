import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { queryClient } from '@/core/http/queryClient.ts';
import { ANALYTICS_EVENTS } from '@/shared/analytics/analytics.constants.ts';
import { captureAnalyticsEvent } from '@/shared/analytics/capture.ts';
import { billingQueryKeys } from '@/shared/api/billing-query-keys.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
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
 * Drop the previous tenant's org-scoped query cache on an active-org change.
 * These keys omit the org id (`['organization', …]`, `['org', …]`,
 * `['billing', …]`), so without this they would collide across orgs — and
 * because the default `staleTime` is 5 min, the next org's tables would render
 * the PREVIOUS org's rows with no refetch. `removeQueries` (not `invalidate`)
 * deletes the data so the new org re-fetches from scratch; mounted observers
 * fall to a loading state rather than briefly showing another tenant's data.
 * Every active-org change funnels through these two functions, so this is the
 * single chokepoint that guarantees isolation.
 */
function clearActiveOrgQueryCache(): void {
  queryClient.removeQueries({ queryKey: orgQueryKeys.all }); // members/invitations/roles/api-keys
  queryClient.removeQueries({ queryKey: ['org'] }); // webhooks
  queryClient.removeQueries({ queryKey: billingQueryKeys.all }); // subscription/invoices/payment methods
}

export async function switchToOrganization(
  organizationId: string,
): Promise<MeContext | undefined> {
  const result = await liveSwitch('/auth/switch-to-organization', {
    organization_id: organizationId,
  });
  if (result) {
    clearActiveOrgQueryCache();
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
    clearActiveOrgQueryCache();
    deriveOrgContext(result);
    captureAnalyticsEvent(ANALYTICS_EVENTS.organizationSwitched, {
      target_type: result.activeOrganization?.type ?? 'PERSONAL',
      switch_target: 'personal',
    });
  }
  return result;
}

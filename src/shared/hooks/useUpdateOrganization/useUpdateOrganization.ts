import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { meContextQueryKey } from '@/shared/tenancy/me-context.ts';
import {
  updateOrganization,
  type UpdateOrganizationInput,
} from '@/shared/tenancy/my-organizations.ts';

/**
 * Rename the active organization (name-only — the URL/slug is unchanged). The
 * name is rendered from TWO server queries: the General panel reads the
 * `['organizations']` list, while the org switcher and dashboard header read
 * `me/context` (`activeOrganization.name`). Invalidate BOTH on success, or the
 * switcher/header keep showing the old name until the next reload.
 */
export function useUpdateOrganization() {
  const organizationId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (input: UpdateOrganizationInput) => {
      if (!organizationId) throw new Error('No active organization');
      return updateOrganization(organizationId, input);
    },
    invalidateKeys: [['organizations'], meContextQueryKey],
    successMessage: i18n.t(ERRORS_KEYS.frontend.organization.updateSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

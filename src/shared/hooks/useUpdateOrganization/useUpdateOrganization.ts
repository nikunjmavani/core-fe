import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import {
  updateOrganization,
  type UpdateOrganizationInput,
} from '@/shared/tenancy/my-organizations.ts';

/**
 * Rename the active organization (name-only — the URL/slug is unchanged). The
 * org name is sourced from the `['organizations']` query (not the store), so on
 * success we invalidate that list and the switcher + panel re-render with it.
 */
export function useUpdateOrganization() {
  const organizationId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (input: UpdateOrganizationInput) => {
      if (!organizationId) throw new Error('No active organization');
      return updateOrganization(organizationId, input);
    },
    invalidateKeys: [['organizations']],
    successMessage: i18n.t(ERRORS_KEYS.frontend.organization.updateSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

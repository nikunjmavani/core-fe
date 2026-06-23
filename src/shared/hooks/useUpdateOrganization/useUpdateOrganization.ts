import { useMutation, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/shared/notify/index.ts';
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
  const queryClient = useQueryClient();
  const organizationId = useOrganizationStore((s) => s.organizationId);
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => {
      if (!organizationId) throw new Error('No active organization');
      return updateOrganization(organizationId, input);
    },
    onSuccess: () => {
      notify.success('Organization updated');
      return queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: () => notify.error('Could not update organization'),
  });
}

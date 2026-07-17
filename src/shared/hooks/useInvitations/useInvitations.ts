import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import * as orgApi from '@/shared/api/organization-api.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

/**
 * Invite a member by email. core-be models an invitation as an INVITED
 * membership (`POST /organization/memberships`), so the new invitee lands in
 * the MEMBERS list — invalidate that, not a separate invitations list. This is
 * the only invitation hook: core-be has no standalone /invitations resource, so
 * revoke/resend happen through membership actions (see useMembers).
 */
export function useInviteMember() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (input: { email: string; roleId: string }) => orgApi.inviteMember(input),
    invalidateKeys: [orgQueryKeys.members(orgId)],
    successMessage: (member) =>
      i18n.t(ERRORS_KEYS.frontend.hooks.invitations.sendSuccess, {
        ns: ERRORS_NS,
        email: member.email,
      }),
  });
}

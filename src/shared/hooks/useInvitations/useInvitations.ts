import { useQuery } from '@tanstack/react-query';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import * as orgApi from '@/shared/api/organization-api.ts';
import type { Invitation, OrgRole } from '@/shared/api/organization-contracts.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

/**
 * Invitations of the active organization — list query + send/revoke/resend mutations.
 * Server state only — never mirrored into Zustand (file-structure.mdc).
 */
/** Invitations for the active organization. */
export function useInvitations() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useQuery({
    queryKey: orgQueryKeys.invitations(orgId),
    queryFn: orgApi.listInvitations,
  });
}

/** Send a new invitation, then refresh the invitations list. */
export function useCreateInvitation() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (input: { email: string; role: OrgRole }) =>
      orgApi.createInvitation(input),
    invalidateKeys: [orgQueryKeys.invitations(orgId)],
    successMessage: (invitation) =>
      i18n.t(ERRORS_KEYS.frontend.hooks.invitations.sendSuccess, {
        ns: ERRORS_NS,
        email: invitation.email,
      }),
  });
}

/** Revoke a pending invitation — optimistically drops it from the list. */
export function useRevokeInvitation() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (invitationId: string) => orgApi.revokeInvitation(invitationId),
    invalidateKeys: [orgQueryKeys.invitations(orgId)],
    optimistic: {
      queryKey: orgQueryKeys.invitations(orgId),
      update: (previous: Invitation[] | undefined, invitationId) =>
        previous?.filter((invitation) => invitation.id !== invitationId),
    },
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.invitations.revokeSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

/** Resend a pending invitation, then refresh the list. */
export function useResendInvitation() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (invitationId: string) => orgApi.resendInvitation(invitationId),
    invalidateKeys: [orgQueryKeys.invitations(orgId)],
    successMessage: (invitation) =>
      i18n.t(ERRORS_KEYS.frontend.hooks.invitations.resendSuccess, {
        ns: ERRORS_NS,
        email: invitation.email,
      }),
  });
}

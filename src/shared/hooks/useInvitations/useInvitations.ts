import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import * as orgApi from '@/shared/api/organization-api.ts';
import type { OrgRole } from '@/shared/api/organization-contracts.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';

/**
 * Invitations of the active organization — list query + send/revoke/resend mutations.
 * Server state only — never mirrored into Zustand (file-structure.mdc).
 */
/** Invitations for the active organization. */
export function useInvitations() {
  return useQuery({
    queryKey: orgQueryKeys.invitations(),
    queryFn: orgApi.listInvitations,
  });
}

/** Send a new invitation, then refresh the invitations list. */
export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: OrgRole }) =>
      orgApi.createInvitation(input),
    onSuccess: (invitation) => {
      toast.success(`Invitation sent to ${invitation.email}`);
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.invitations() });
    },
    onError: () => toast.error('Could not send invitation'),
  });
}

/** Revoke a pending invitation, then refresh the list. */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => orgApi.revokeInvitation(invitationId),
    onSuccess: () => {
      toast.success('Invitation revoked');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.invitations() });
    },
    onError: () => toast.error('Could not revoke invitation'),
  });
}

/** Resend a pending invitation, then refresh the list. */
export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => orgApi.resendInvitation(invitationId),
    onSuccess: (invitation) => {
      toast.success(`Invitation resent to ${invitation.email}`);
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.invitations() });
    },
    onError: () => toast.error('Could not resend invitation'),
  });
}

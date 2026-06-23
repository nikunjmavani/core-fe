import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as orgApi from '@/shared/api/organization-api.ts';
import type { MembershipStatus, OrgRole } from '@/shared/api/organization-contracts.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { notify } from '@/shared/notify/index.ts';

/**
 * Members of the active organization — list query + role/status/removal mutations.
 * Server state only — never mirrored into Zustand (file-structure.mdc).
 */
/** Members of the active organization. */
export function useMembers() {
  return useQuery({ queryKey: orgQueryKeys.members(), queryFn: orgApi.listMembers });
}

/** Update a member's role, then refresh the members list. */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { membershipId: string; role: OrgRole }) =>
      orgApi.updateMemberRole(input),
    onSuccess: () => {
      notify.success('Member role updated');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.members() });
    },
    onError: () => notify.error('Could not update role'),
  });
}

/** Remove a member, then refresh the members list. */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => orgApi.removeMember(membershipId),
    onSuccess: () => {
      notify.success('Member removed');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.members() });
    },
    onError: () => notify.error('Could not remove member'),
  });
}

/** Suspend or reactivate a member, then refresh the members list. */
export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { membershipId: string; status: MembershipStatus }) =>
      orgApi.updateMemberStatus(input),
    onSuccess: (member) => {
      notify.success(
        member.status === 'suspended' ? 'Member suspended' : 'Member reactivated',
      );
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.members() });
    },
    onError: () => notify.error('Could not update member'),
  });
}

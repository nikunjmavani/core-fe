import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import * as orgApi from '@/shared/api/organization-api.ts';
import type {
  Member,
  MembershipStatus,
  OrgRole,
} from '@/shared/api/organization-contracts.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';
import { notify } from '@/shared/notify/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

/**
 * Members of the active organization — list query + role/status/removal mutations.
 * Server state only — never mirrored into Zustand (file-structure.mdc).
 */
/** Members of the active organization. */
export function useMembers() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useQuery({ queryKey: orgQueryKeys.members(orgId), queryFn: orgApi.listMembers });
}

/** Update a member's role with optimistic UI, then refresh the members list. */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const orgId = useOrganizationStore((s) => s.organizationId);
  const membersKey = orgQueryKeys.members(orgId);
  return useMutation({
    mutationFn: (input: { membershipId: string; role: OrgRole }) =>
      orgApi.updateMemberRole(input),
    onMutate: async ({ membershipId, role }) => {
      await queryClient.cancelQueries({ queryKey: membersKey });
      const previous = queryClient.getQueryData<Member[]>(membersKey);
      queryClient.setQueryData<Member[]>(membersKey, (old) =>
        old?.map((m) => (m.id === membershipId ? { ...m, role } : m)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(membersKey, context.previous);
      }
      notify.error(
        i18n.t(ERRORS_KEYS.frontend.hooks.members.updateRoleFailed, { ns: ERRORS_NS }),
      );
    },
    onSuccess: () => {
      notify.success(
        i18n.t(ERRORS_KEYS.frontend.hooks.members.updateRoleSuccess, { ns: ERRORS_NS }),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: membersKey }),
  });
}

/** Remove a member — optimistically drops the row from the list. */
export function useRemoveMember() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (membershipId: string) => orgApi.removeMember(membershipId),
    invalidateKeys: [orgQueryKeys.members(orgId)],
    optimistic: {
      queryKey: orgQueryKeys.members(orgId),
      update: (previous: Member[] | undefined, membershipId) =>
        previous?.filter((member) => member.id !== membershipId),
    },
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.members.removeSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

/** Suspend or reactivate a member — optimistically flips the status badge. */
export function useUpdateMemberStatus() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (input: { membershipId: string; status: MembershipStatus }) =>
      orgApi.updateMemberStatus(input),
    invalidateKeys: [orgQueryKeys.members(orgId)],
    optimistic: {
      queryKey: orgQueryKeys.members(orgId),
      update: (previous: Member[] | undefined, { membershipId, status }) =>
        previous?.map((member) =>
          member.id === membershipId ? { ...member, status } : member,
        ),
    },
    successMessage: (member) =>
      i18n.t(
        member.status === 'suspended'
          ? ERRORS_KEYS.frontend.hooks.members.suspendSuccess
          : ERRORS_KEYS.frontend.hooks.members.reactivateSuccess,
        { ns: ERRORS_NS },
      ),
  });
}

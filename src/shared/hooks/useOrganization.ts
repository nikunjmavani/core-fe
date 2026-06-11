import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import * as orgApi from '@/shared/api/organization-api.ts';
import type {
  MembershipStatus,
  OrgRole,
  Plan,
  RoleInput,
} from '@/shared/api/organization-contracts.ts';

/**
 * Shared TanStack Query hooks for the organization domain (members, invitations,
 * roles, API keys, subscription). Used by both the dashboard and the org
 * management settings. Server state only — never mirrored into Zustand.
 */
export const orgQueryKeys = {
  all: ['organization'] as const,
  members: () => [...orgQueryKeys.all, 'members'] as const,
  invitations: () => [...orgQueryKeys.all, 'invitations'] as const,
  roles: () => [...orgQueryKeys.all, 'roles'] as const,
  apiKeys: () => [...orgQueryKeys.all, 'api-keys'] as const,
  subscription: () => [...orgQueryKeys.all, 'subscription'] as const,
};

/** Members of the active organization. */
export function useMembers() {
  return useQuery({ queryKey: orgQueryKeys.members(), queryFn: orgApi.listMembers });
}

/** Invitations for the active organization. */
export function useInvitations() {
  return useQuery({
    queryKey: orgQueryKeys.invitations(),
    queryFn: orgApi.listInvitations,
  });
}

/** Roles defined in the active organization. */
export function useRoles() {
  return useQuery({ queryKey: orgQueryKeys.roles(), queryFn: orgApi.listRoles });
}

/** API keys for the active organization. */
export function useApiKeys() {
  return useQuery({ queryKey: orgQueryKeys.apiKeys(), queryFn: orgApi.listApiKeys });
}

/** Subscription for the active organization. */
export function useSubscription() {
  return useQuery({
    queryKey: orgQueryKeys.subscription(),
    queryFn: orgApi.getSubscription,
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

/** Update a member's role, then refresh the members list. */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { membershipId: string; role: OrgRole }) =>
      orgApi.updateMemberRole(input),
    onSuccess: () => {
      toast.success('Member role updated');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.members() });
    },
    onError: () => toast.error('Could not update role'),
  });
}

/** Remove a member, then refresh the members list. */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => orgApi.removeMember(membershipId),
    onSuccess: () => {
      toast.success('Member removed');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.members() });
    },
    onError: () => toast.error('Could not remove member'),
  });
}

/** Suspend or reactivate a member, then refresh the members list. */
export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { membershipId: string; status: MembershipStatus }) =>
      orgApi.updateMemberStatus(input),
    onSuccess: (member) => {
      toast.success(
        member.status === 'suspended' ? 'Member suspended' : 'Member reactivated',
      );
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.members() });
    },
    onError: () => toast.error('Could not update member'),
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

/** Create a custom role, then refresh the roles list. */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleInput) => orgApi.createRole(input),
    onSuccess: (role) => {
      toast.success(`Role "${role.name}" created`);
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.roles() });
    },
    onError: () => toast.error('Could not create role'),
  });
}

/** Update a custom role, then refresh the roles list. */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleInput & { id: string }) => orgApi.updateRole(input),
    onSuccess: (role) => {
      toast.success(`Role "${role.name}" updated`);
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.roles() });
    },
    onError: () => toast.error('Could not update role'),
  });
}

/** Delete a custom role, then refresh the roles list. */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => orgApi.deleteRole(roleId),
    onSuccess: () => {
      toast.success('Role deleted');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.roles() });
    },
    onError: () => toast.error('Could not delete role'),
  });
}

/** Create an API key. The full secret is returned to the caller exactly once. */
export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; expiresInDays: '30' | '90' | '365' | 'never' }) =>
      orgApi.createApiKey(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgQueryKeys.apiKeys() }),
    onError: () => toast.error('Could not create API key'),
  });
}

/** Rename an API key, then refresh the list. */
export function useRenameApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) => orgApi.renameApiKey(input),
    onSuccess: () => {
      toast.success('API key renamed');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.apiKeys() });
    },
    onError: () => toast.error('Could not rename API key'),
  });
}

/** Revoke (delete) an API key, then refresh the list. */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => orgApi.revokeApiKey(keyId),
    onSuccess: () => {
      toast.success('API key revoked');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.apiKeys() });
    },
    onError: () => toast.error('Could not revoke API key'),
  });
}

/** Change the subscription plan, then refresh the subscription. */
export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) => orgApi.updateSubscriptionPlan(plan),
    onSuccess: (subscription) => {
      toast.success(`Switched to the ${subscription.plan} plan`);
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.subscription() });
    },
    onError: () => toast.error('Could not change plan'),
  });
}

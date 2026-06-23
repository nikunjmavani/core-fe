import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as orgApi from '@/shared/api/organization-api.ts';
import type { RoleInput } from '@/shared/api/organization-contracts.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { notify } from '@/shared/notify/index.ts';

/**
 * Roles of the active organization — list query + create/update/delete mutations.
 * Server state only — never mirrored into Zustand (file-structure.mdc).
 */
/** Roles defined in the active organization. */
export function useRoles() {
  return useQuery({ queryKey: orgQueryKeys.roles(), queryFn: orgApi.listRoles });
}

/** Create a custom role, then refresh the roles list. */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleInput) => orgApi.createRole(input),
    onSuccess: (role) => {
      notify.success(`Role "${role.name}" created`);
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.roles() });
    },
    onError: () => notify.error('Could not create role'),
  });
}

/** Update a custom role, then refresh the roles list. */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleInput & { id: string }) => orgApi.updateRole(input),
    onSuccess: (role) => {
      notify.success(`Role "${role.name}" updated`);
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.roles() });
    },
    onError: () => notify.error('Could not update role'),
  });
}

/** Delete a custom role, then refresh the roles list. */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => orgApi.deleteRole(roleId),
    onSuccess: () => {
      notify.success('Role deleted');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.roles() });
    },
    onError: () => notify.error('Could not delete role'),
  });
}

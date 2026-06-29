import { useQuery } from '@tanstack/react-query';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import * as orgApi from '@/shared/api/organization-api.ts';
import type { RoleInput } from '@/shared/api/organization-contracts.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';

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
  return useAppMutation({
    mutationFn: (input: RoleInput) => orgApi.createRole(input),
    invalidateKeys: [orgQueryKeys.roles()],
    successMessage: (role) =>
      i18n.t(ERRORS_KEYS.frontend.hooks.roles.createSuccess, {
        ns: ERRORS_NS,
        name: role.name,
      }),
  });
}

/** Update a custom role, then refresh the roles list. */
export function useUpdateRole() {
  return useAppMutation({
    mutationFn: (input: RoleInput & { id: string }) => orgApi.updateRole(input),
    invalidateKeys: [orgQueryKeys.roles()],
    successMessage: (role) =>
      i18n.t(ERRORS_KEYS.frontend.hooks.roles.updateSuccess, {
        ns: ERRORS_NS,
        name: role.name,
      }),
  });
}

/** Delete a custom role, then refresh the roles list. */
export function useDeleteRole() {
  return useAppMutation({
    mutationFn: (roleId: string) => orgApi.deleteRole(roleId),
    invalidateKeys: [orgQueryKeys.roles()],
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.roles.deleteSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

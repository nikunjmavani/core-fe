import { useQuery } from '@tanstack/react-query';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import * as orgApi from '@/shared/api/organization-api.ts';
import type { ApiKey } from '@/shared/api/organization-contracts.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

/**
 * API keys of the active organization — list query + create/rename/revoke mutations.
 * Server state only — never mirrored into Zustand (file-structure.mdc).
 */
/** API keys for the active organization. */
export function useApiKeys() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useQuery({ queryKey: orgQueryKeys.apiKeys(orgId), queryFn: orgApi.listApiKeys });
}

/** Create an API key. The full secret is returned to the caller exactly once. */
export function useCreateApiKey() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (input: { name: string; expiresInDays: '30' | '90' | '365' | 'never' }) =>
      orgApi.createApiKey(input),
    invalidateKeys: [orgQueryKeys.apiKeys(orgId)],
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.apiKeys.createSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

/** Rename an API key — optimistically patches the renamed row. */
export function useRenameApiKey() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (input: { id: string; name: string }) => orgApi.renameApiKey(input),
    invalidateKeys: [orgQueryKeys.apiKeys(orgId)],
    optimistic: {
      queryKey: orgQueryKeys.apiKeys(orgId),
      update: (previous: ApiKey[] | undefined, input) =>
        previous?.map((key) =>
          key.id === input.id ? { ...key, name: input.name } : key,
        ),
    },
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.apiKeys.renameSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

/** Revoke (delete) an API key — optimistically drops it from the list. */
export function useRevokeApiKey() {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useAppMutation({
    mutationFn: (keyId: string) => orgApi.revokeApiKey(keyId),
    invalidateKeys: [orgQueryKeys.apiKeys(orgId)],
    optimistic: {
      queryKey: orgQueryKeys.apiKeys(orgId),
      update: (previous: ApiKey[] | undefined, keyId) =>
        previous?.filter((key) => key.id !== keyId),
    },
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.apiKeys.revokeSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as orgApi from '@/shared/api/organization-api.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { notify } from '@/shared/notify/index.ts';

/**
 * API keys of the active organization — list query + create/rename/revoke mutations.
 * Server state only — never mirrored into Zustand (file-structure.mdc).
 */
/** API keys for the active organization. */
export function useApiKeys() {
  return useQuery({ queryKey: orgQueryKeys.apiKeys(), queryFn: orgApi.listApiKeys });
}

/** Create an API key. The full secret is returned to the caller exactly once. */
export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; expiresInDays: '30' | '90' | '365' | 'never' }) =>
      orgApi.createApiKey(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgQueryKeys.apiKeys() }),
    onError: () => notify.error('Could not create API key'),
  });
}

/** Rename an API key, then refresh the list. */
export function useRenameApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) => orgApi.renameApiKey(input),
    onSuccess: () => {
      notify.success('API key renamed');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.apiKeys() });
    },
    onError: () => notify.error('Could not rename API key'),
  });
}

/** Revoke (delete) an API key, then refresh the list. */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => orgApi.revokeApiKey(keyId),
    onSuccess: () => {
      notify.success('API key revoked');
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.apiKeys() });
    },
    onError: () => notify.error('Could not revoke API key'),
  });
}

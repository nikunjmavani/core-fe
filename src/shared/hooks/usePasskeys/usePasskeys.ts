import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listPasskeys,
  registerPasskey,
  removePasskey,
} from '@/shared/api/passkeys-api.ts';
import { notify } from '@/shared/notify/index.ts';

/** TanStack Query key for the account's passkeys. */
export const passkeysQueryKey = ['account', 'passkeys'] as const;

/** Registered passkeys for the account (FE-32). */
export function usePasskeys() {
  return useQuery({ queryKey: passkeysQueryKey, queryFn: listPasskeys });
}

/** Register a new passkey, then refresh the list. */
export function useRegisterPasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => registerPasskey(name),
    onSuccess: () => {
      notify.success('Passkey added');
      return queryClient.invalidateQueries({ queryKey: passkeysQueryKey });
    },
    onError: () => notify.error('Could not add passkey'),
  });
}

/** Revoke a passkey, then refresh the list. */
export function useRemovePasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removePasskey(id),
    onSuccess: () => {
      notify.success('Passkey removed');
      return queryClient.invalidateQueries({ queryKey: passkeysQueryKey });
    },
    onError: () => notify.error('Could not remove passkey'),
  });
}

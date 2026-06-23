import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '@/shared/api/mfa-api.ts';
import { notify } from '@/shared/notify/index.ts';

const mfaQueryKey = ['auth', 'mfa'] as const;

/** Whether MFA is enabled for the signed-in account. */
export function useMfaStatus() {
  return useQuery({ queryKey: mfaQueryKey, queryFn: api.getMfaStatus });
}

/** Begin enrollment (returns the secret + otpauth URI). */
export function useBeginMfaEnrollment() {
  return useMutation({ mutationFn: () => api.beginMfaEnrollment() });
}

/** Confirm enrollment with a TOTP code; refreshes status on success. */
export function useConfirmMfaEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.confirmMfaEnrollment(code),
    onSuccess: () => {
      notify.success('Two-factor authentication enabled');
      return queryClient.invalidateQueries({ queryKey: mfaQueryKey });
    },
  });
}

/** Disable MFA; refreshes status on success. */
export function useDisableMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.disableMfa(),
    onSuccess: () => {
      notify.success('Two-factor authentication disabled');
      return queryClient.invalidateQueries({ queryKey: mfaQueryKey });
    },
    onError: () => notify.error('Could not disable two-factor authentication'),
  });
}

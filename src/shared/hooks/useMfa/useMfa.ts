import { useMutation, useQuery } from '@tanstack/react-query';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import * as api from '@/shared/api/mfa-api.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';

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
  return useAppMutation({
    mutationFn: (code: string) => api.confirmMfaEnrollment(code),
    invalidateKeys: [mfaQueryKey],
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.mfa.enableSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

/** Disable MFA; refreshes status on success. */
export function useDisableMfa() {
  return useAppMutation({
    mutationFn: () => api.disableMfa(),
    invalidateKeys: [mfaQueryKey],
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.mfa.disableSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

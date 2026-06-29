import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { apiClient } from '@/core/http/fetch-client.ts';

const MFA_API = `${API_BASE_PATH}/auth/me/mfa`;

export interface MfaEnrollment {
  secret: string;
  otpauthUri: string;
}
export interface MfaConfirmation {
  recoveryCodes: string[];
}

const enrollWireSchema = z.object({ secret: z.string(), otpauth_uri: z.string() });
const confirmWireSchema = z.object({ recovery_codes: z.array(z.string()) });

export async function getMfaStatus(): Promise<boolean> {
  const res = await apiClient.get<unknown>(MFA_API);
  return z.array(z.unknown()).parse(res.data).length > 0;
}

export async function beginMfaEnrollment(): Promise<MfaEnrollment> {
  const res = await apiClient.post<unknown>(`${MFA_API}/enroll`, {
    method_type: 'MFA_TOTP',
  });
  const wire = enrollWireSchema.parse(res.data);
  return { secret: wire.secret, otpauthUri: wire.otpauth_uri };
}

export async function confirmMfaEnrollment(code: string): Promise<MfaConfirmation> {
  const res = await apiClient.post<unknown>(`${MFA_API}/enroll/confirm`, {
    totp_code: code,
  });
  return { recoveryCodes: confirmWireSchema.parse(res.data).recovery_codes };
}

export async function disableMfa(): Promise<void> {
  await apiClient.delete<unknown>(MFA_API);
}

import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';

import { mfaMockStore } from './mfa-mock-store.ts';

/**
 * TOTP multi-factor enrollment (core-be `/auth/me/mfa`), mock-first. This is the
 * *setup* flow (begin → confirm → recovery codes), distinct from the login-time
 * second factor in `auth-api.ts`. REPLACE_WITH_API.
 */
const MFA_API = `${API_BASE_PATH}/auth/me/mfa`;

export interface MfaEnrollment {
  secret: string;
  otpauthUri: string;
}
export interface MfaConfirmation {
  recoveryCodes: string[];
}

const statusWireSchema = z.object({ enabled: z.boolean() });
const enrollWireSchema = z.object({ secret: z.string(), otpauth_uri: z.string() });
const confirmWireSchema = z.object({ recovery_codes: z.array(z.string()) });

/** Whether MFA is currently enabled for the account (`GET /auth/me/mfa`). */
export async function getMfaStatus(): Promise<boolean> {
  if (config.useMockApi) return mockResponse(mfaMockStore.isEnabled());
  const res = await apiClient.get<unknown>(MFA_API);
  return statusWireSchema.parse(res.data).enabled;
}

/** Begin enrollment — returns the shared secret + otpauth URI (`POST …/enroll`). */
export async function beginMfaEnrollment(): Promise<MfaEnrollment> {
  if (config.useMockApi) return mockResponse(mfaMockStore.begin());
  const res = await apiClient.post<unknown>(`${MFA_API}/enroll`, {});
  const wire = enrollWireSchema.parse(res.data);
  return { secret: wire.secret, otpauthUri: wire.otpauth_uri };
}

/**
 * Confirm enrollment with a 6-digit TOTP code; on success MFA is enabled and
 * one-time recovery codes are returned (`POST …/confirm`).
 */
export async function confirmMfaEnrollment(code: string): Promise<MfaConfirmation> {
  if (config.useMockApi) {
    if (!/^\d{6}$/.test(code)) {
      return mockResponse(
        { recoveryCodes: [] },
        { failWith: new Error('Enter the 6-digit code from your authenticator app.') },
      );
    }
    return mockResponse(mfaMockStore.confirm());
  }
  const res = await apiClient.post<unknown>(`${MFA_API}/confirm`, { totp_code: code });
  return { recoveryCodes: confirmWireSchema.parse(res.data).recovery_codes };
}

/** Disable MFA for the account (`DELETE /auth/me/mfa`). */
export async function disableMfa(): Promise<void> {
  if (config.useMockApi) {
    mfaMockStore.disable();
    return mockResponse(undefined);
  }
  await apiClient.delete<unknown>(MFA_API);
}

import { API_BASE_PATH, API_ENDPOINTS, HTTP } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { mockResponse } from '@/core/http/mock.ts';
import {
  MOCK_ACCESS_TOKEN,
  MOCK_USER,
  startMockSession,
} from '@/shared/auth/mock-auth.ts';
import { isMockLoginValid } from '@/shared/auth/mock-credentials.ts';
import type { AuthTokenResponse, AuthUser } from '@/shared/auth/types.ts';
import { authUserSchema } from '@/shared/auth/types.ts';

import type {
  ForgotPasswordInput,
  LoginInput,
  MfaVerifyInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth-contracts.ts';

const authBase = () => `${config.apiBaseUrl}${API_BASE_PATH}`;

/**
 * Raw fetch with timeout and credentials for auth endpoints.
 * Does not use apiClient to avoid interceptor recursion.
 */
async function authFetch(
  url: string,
  init: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = HTTP.TIMEOUT, ...rest } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...rest,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(rest.headers as Record<string, string>),
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Auth API functions.
 *
 * Uses raw `fetch` (NOT apiClient) to avoid interceptor recursion.
 * Auth endpoints need special handling since they manage the very
 * tokens that the interceptor injects.
 */
/** Unwrap the core-be `{ data, meta }` envelope; pass a bare body through. */
function unwrapEnvelope(json: unknown): unknown {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: unknown }).data;
  }
  return json;
}

/** Human error message from the core-be error envelope or a bare `{ message }`. */
function errorMessage(json: unknown, fallback: string): string {
  const j = json as
    | { error?: { detail?: string; reason?: string }; message?: string }
    | null
    | undefined;
  return j?.error?.detail ?? j?.error?.reason ?? j?.message ?? fallback;
}

function throwOnNotOk(_response: Response, json: unknown, fallback: string): never {
  throw new Error(errorMessage(json, fallback));
}

/**
 * Extract the access token from a token response. Tolerant of the core-be shape
 * (`{ data: { access_token } }`, snake_case + enveloped) and a bare
 * `{ accessToken }`; surfaces the MFA-required branch as a clear error.
 */
function extractAccessToken(json: unknown, fallback: string): AuthTokenResponse {
  const payload = unwrapEnvelope(json) as
    | { access_token?: string; accessToken?: string; mfa_required?: boolean }
    | null
    | undefined;
  if (payload?.mfa_required) {
    throw new Error('Multi-factor authentication is required (not yet supported here).');
  }
  const token = payload?.access_token ?? payload?.accessToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(fallback);
  }
  return { accessToken: token };
}

/** Resolve a mock token + start a mock session (shared by mock auth methods). */
function mockToken(): Promise<AuthTokenResponse> {
  startMockSession();
  return mockResponse({ accessToken: MOCK_ACCESS_TOKEN });
}

export const authApi = {
  login: async (data: LoginInput): Promise<AuthTokenResponse> => {
    // REPLACE_WITH_API: POST /api/v1/auth/login
    if (config.useMockApi) {
      if (!isMockLoginValid(data)) {
        throw new Error('Invalid email or password');
      }
      return mockToken();
    }
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.LOGIN}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = (await response.json()) as unknown;
    if (!response.ok) throwOnNotOk(response, json, `Login failed (${response.status})`);
    return extractAccessToken(json, `Authentication failed (${response.status})`);
  },

  register: async (data: RegisterInput): Promise<AuthTokenResponse> => {
    // core-be has no /auth/register — signup IS the registration endpoint
    // (auto-provisions the user + their personal organization).
    if (config.useMockApi) return mockToken();
    const response = await authFetch(`${authBase()}/auth/signup`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `Register failed (${response.status})`);
    return extractAccessToken(json, `Authentication failed (${response.status})`);
  },

  forgotPassword: async (data: ForgotPasswordInput): Promise<void> => {
    const response = await authFetch(
      `${authBase()}${API_ENDPOINTS.AUTH.FORGOT_PASSWORD}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `Forgot password failed (${response.status})`);
  },

  resetPassword: async (data: ResetPasswordInput): Promise<void> => {
    const response = await authFetch(
      `${authBase()}${API_ENDPOINTS.AUTH.RESET_PASSWORD}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `Reset password failed (${response.status})`);
  },

  verifyEmail: async (data: VerifyEmailInput): Promise<AuthTokenResponse> => {
    // REPLACE_WITH_API: POST /api/v1/auth/email/verify
    if (config.useMockApi) return mockToken();
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.VERIFY_EMAIL}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `Verify email failed (${response.status})`);
    return extractAccessToken(json, `Authentication failed (${response.status})`);
  },

  mfaVerify: async (data: MfaVerifyInput, token: string): Promise<AuthTokenResponse> => {
    // REPLACE_WITH_API: POST /api/v1/auth/mfa/verify
    if (config.useMockApi) return mockToken();
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.MFA_VERIFY}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `MFA verify failed (${response.status})`);
    return extractAccessToken(json, `Authentication failed (${response.status})`);
  },

  me: async (token: string): Promise<AuthUser> => {
    // REPLACE_WITH_API: GET /api/v1/users/me
    if (config.useMockApi) return mockResponse(MOCK_USER);
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.ME}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `Failed to load profile (${response.status})`);
    const u = unwrapEnvelope(json) as Record<string, unknown>;
    // Tolerate the real core-be UserOutput (snake_case, nullable fields) and a
    // bare AuthUser (camelCase, used by unit tests). authUserSchema's optional
    // fields are string|undefined, so coerce the backend's nulls to undefined.
    const joined = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return authUserSchema.parse({
      id: u.id,
      email: u.email,
      role: (u.role as string | undefined) ?? 'user',
      name: (u.name as string | undefined) ?? (joined.length > 0 ? joined : undefined),
      avatarUrl: (u.avatarUrl ?? u.avatar_url ?? undefined) as string | undefined,
      organizationId: (u.organizationId ?? u.personal_organization_id ?? undefined) as
        | string
        | undefined,
    });
  },

  /**
   * Persist profile fields collected during onboarding (name, job title).
   * Best-effort by contract: the caller must not block the user on it — a
   * failure here should never trap someone on the onboarding screen.
   */
  updateProfile: async (
    input: { name?: string; jobTitle?: string },
    token: string,
  ): Promise<void> => {
    // REPLACE_WITH_API: PATCH /api/v1/users/me
    if (config.useMockApi) {
      await mockResponse(null);
      return;
    }
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.ME}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as unknown;
      throwOnNotOk(response, json, `Profile update failed (${response.status})`);
    }
  },
};

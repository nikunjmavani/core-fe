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
import { authTokenResponseSchema, authUserSchema } from '@/shared/auth/types.ts';

import type {
  ForgotPasswordInput,
  LoginInput,
  MfaVerifyInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.contracts.ts';

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
function throwOnNotOk(_response: Response, json: unknown, fallback: string): never {
  const message = (json as { message?: string })?.message ?? fallback;
  throw new Error(message);
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
    return authTokenResponseSchema.parse(json);
  },

  register: async (data: RegisterInput): Promise<AuthTokenResponse> => {
    // REPLACE_WITH_API: POST /api/v1/auth/register
    if (config.useMockApi) return mockToken();
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.REGISTER}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `Register failed (${response.status})`);
    return authTokenResponseSchema.parse(json);
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
    return authTokenResponseSchema.parse(json);
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
    return authTokenResponseSchema.parse(json);
  },

  me: async (token: string): Promise<AuthUser> => {
    // REPLACE_WITH_API: GET /api/v1/users/me
    if (config.useMockApi) return mockResponse(MOCK_USER);
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.ME}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await response.json()) as unknown;
    return authUserSchema.parse(json);
  },
};

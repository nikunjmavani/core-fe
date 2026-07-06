import { API_BASE_PATH, API_ENDPOINTS, HTTP } from '@/core/config/constants.ts';
import { platformConfig } from '@/core/config/env.ts';
import { authCaptchaHeaders } from '@/shared/auth/captcha/auth-captcha-headers.ts';
import type { AuthTokenResponse, AuthUser } from '@/shared/auth/types.ts';
import { authUserSchema } from '@/shared/auth/types.ts';
import { AppError } from '@/shared/errors/AppError.ts';
import { FRONTEND_ERROR_CODES } from '@/shared/errors/frontend-error-codes.ts';

import type {
  EmailVerificationCodeInput,
  LoginInput,
  MfaVerifyInput,
} from './auth-contracts.ts';

const authBase = () => `${platformConfig.apiBaseUrl}${API_BASE_PATH}`;

function mergeAuthHeaders(
  init: RequestInit,
  captchaToken?: string,
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(authCaptchaHeaders(captchaToken) ?? {}),
    ...(init.headers as Record<string, string> | undefined),
  };
}

/**
 * Raw fetch with timeout and credentials for auth endpoints.
 * Does not use apiClient to avoid interceptor recursion.
 */
async function authFetch(
  url: string,
  init: RequestInit & { timeout?: number; captchaToken?: string } = {},
): Promise<Response> {
  const { timeout = HTTP.TIMEOUT, captchaToken, ...rest } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...rest,
      credentials: 'include',
      signal: controller.signal,
      headers: mergeAuthHeaders(rest, captchaToken),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

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
    { error?: { detail?: string; reason?: string }; message?: string } | null | undefined;
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
    throw new AppError(
      FRONTEND_ERROR_CODES.AUTH_MFA_UNSUPPORTED,
      401,
      FRONTEND_ERROR_CODES.AUTH_MFA_UNSUPPORTED,
    );
  }
  const token = payload?.access_token ?? payload?.accessToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(fallback);
  }
  return { accessToken: token };
}

/**
 * Thrown by {@link authApi.login} when the account has MFA enabled: the caller
 * must collect a second factor and call {@link authApi.mfaVerify} with the
 * carried `mfaSessionToken` (it is NOT an access token).
 */
export class MfaRequiredError extends Error {
  readonly mfaSessionToken: string;
  constructor(mfaSessionToken: string) {
    super('mfa_required');
    this.name = 'MfaRequiredError';
    this.mfaSessionToken = mfaSessionToken;
  }
}

function parseMfaRequired(json: unknown): MfaRequiredError | null {
  const payload = unwrapEnvelope(json) as {
    mfa_required?: boolean;
    mfa_session_token?: string;
  } | null;
  if (payload?.mfa_required && typeof payload.mfa_session_token === 'string') {
    return new MfaRequiredError(payload.mfa_session_token);
  }
  return null;
}

export const authApi = {
  login: async (data: LoginInput, captchaToken?: string): Promise<AuthTokenResponse> => {
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.LOGIN}`, {
      method: 'POST',
      body: JSON.stringify(data),
      captchaToken,
    });
    const json = (await response.json()) as unknown;
    if (!response.ok) throwOnNotOk(response, json, `Login failed (${response.status})`);
    const mfa = parseMfaRequired(json);
    if (mfa) throw mfa;
    return extractAccessToken(json, `Authentication failed (${response.status})`);
  },

  mfaVerify: async (
    data: MfaVerifyInput,
    mfaSessionToken: string,
  ): Promise<AuthTokenResponse> => {
    const secondFactor = data.useRecoveryCode
      ? { recovery_code: data.code }
      : { totp_code: data.code };
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.MFA_LOGIN}`, {
      method: 'POST',
      body: JSON.stringify({ mfa_session_token: mfaSessionToken, ...secondFactor }),
    });
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `MFA verify failed (${response.status})`);
    return extractAccessToken(json, `Authentication failed (${response.status})`);
  },

  me: async (token: string): Promise<AuthUser> => {
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.ME}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `Failed to load profile (${response.status})`);
    const u = unwrapEnvelope(json) as Record<string, unknown>;
    const joined = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return authUserSchema.parse({
      id: u.id,
      email: u.email,
      role: (u.role as string | undefined) ?? 'user',
      name: (u.name as string | undefined) ?? (joined.length > 0 ? joined : undefined),
      avatarUrl: (u.avatarUrl ?? u.avatar_url ?? undefined) as string | undefined,
      organizationId: (u.organizationId ??
        (u.personal_organization as { id?: string } | null | undefined)?.id ??
        undefined) as string | undefined,
    });
  },

  updateProfile: async (
    input: { name?: string; jobTitle?: string },
    token: string,
  ): Promise<void> => {
    // core-be `PATCH /users/me` expects snake_case keys and models the display
    // name as first_name + last_name (there is no single `name` column). Translate
    // the UI model here so the rest of the app can keep using `name`/`jobTitle`.
    const body: {
      first_name?: string;
      last_name?: string | null;
      job_title?: string;
    } = {};
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      const firstSpace = trimmed.indexOf(' ');
      body.first_name = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
      // A single-token name clears last_name; the rest (after the first space) is the surname.
      body.last_name = firstSpace === -1 ? null : trimmed.slice(firstSpace + 1).trim();
    }
    if (input.jobTitle !== undefined) {
      body.job_title = input.jobTitle;
    }
    const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.ME}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as unknown;
      throwOnNotOk(response, json, `Profile update failed (${response.status})`);
    }
  },

  /** List configured social providers — removed; login UI is env-only. */

  oauthStart: async (provider: string, captchaToken?: string): Promise<string> => {
    const response = await authFetch(
      `${authBase()}/auth/oauth/${encodeURIComponent(provider)}`,
      { method: 'GET', captchaToken },
    );
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(
        response,
        json,
        `Could not start ${provider} sign-in (${response.status})`,
      );
    const data = unwrapEnvelope(json) as { redirect_url?: string; url?: string } | null;
    const redirectUrl = data?.redirect_url ?? data?.url;
    if (typeof redirectUrl !== 'string' || redirectUrl.length === 0) {
      throw new AppError(
        FRONTEND_ERROR_CODES.AUTH_OAUTH_NO_REDIRECT,
        502,
        FRONTEND_ERROR_CODES.AUTH_OAUTH_NO_REDIRECT,
      );
    }
    return redirectUrl;
  },

  emailVerificationCodeSend: async (
    email: string,
    captchaToken?: string,
  ): Promise<void> => {
    const response = await authFetch(
      `${authBase()}${API_ENDPOINTS.AUTH.EMAIL_CODE_SEND}`,
      {
        method: 'POST',
        body: JSON.stringify({ email }),
        captchaToken,
      },
    );
    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as unknown;
      throwOnNotOk(
        response,
        json,
        `Could not send the verification code (${response.status})`,
      );
    }
  },

  emailLogin: async (
    data: EmailVerificationCodeInput,
    captchaToken?: string,
  ): Promise<AuthTokenResponse> => {
    const response = await authFetch(
      `${authBase()}${API_ENDPOINTS.AUTH.EMAIL_CODE_LOGIN}`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          code: data.code,
        }),
        captchaToken,
      },
    );
    const json = (await response.json()) as unknown;
    if (!response.ok)
      throwOnNotOk(response, json, `Email verification failed (${response.status})`);
    const mfa = parseMfaRequired(json);
    if (mfa) throw mfa;
    return extractAccessToken(json, `Authentication failed (${response.status})`);
  },
};

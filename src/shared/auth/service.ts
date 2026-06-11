import {
  API_BASE_PATH,
  API_ENDPOINTS,
  AUTH_ROUTES,
  HTTP,
} from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { queryClient } from '@/core/http/queryClient.ts';
import {
  endMockSession,
  hasMockSession,
  MOCK_ACCESS_TOKEN,
  MOCK_USER,
} from '@/shared/auth/mock-auth.ts';
import { cancelTokenRefresh, scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/shared/auth/token.ts';
import { authTokenResponseSchema, authUserSchema } from '@/shared/auth/types.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import type { AuthUser } from './types.ts';

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
 * Shared logout helper — clears ALL auth state consistently.
 * Used by both the manual `logout()` flow and the fetch client's
 * refresh-failure path to avoid duplicated cleanup logic.
 */
export function forceLogout(): void {
  try {
    cancelTokenRefresh();
    clearAccessToken();
    endMockSession();
    useAuthStore.getState().clearAuth();
    queryClient.clear();
  } catch (cleanupError) {
    if (import.meta.env.DEV) {
      console.error('[Auth] Cleanup failed during logout', cleanupError);
    }
  }
  window.location.href = AUTH_ROUTES.LOGIN;
}

/**
 * Silent refresh — called at app bootstrap BEFORE React mounts.
 *
 * Uses raw `fetch` (NOT apiClient) to avoid the interceptor cycle.
 * The HttpOnly refresh cookie is sent automatically via credentials: 'include'.
 *
 * Atomic: if getCurrentUser() fails after setAccessToken(), the token
 * is rolled back so auth state is never left in an inconsistent state.
 *
 * A module-level mutex prevents concurrent refresh calls (e.g. from
 * multiple 401 interceptor triggers racing).
 */
let refreshPromise: Promise<void> | null = null;

export async function silentRefresh(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doSilentRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

const authBase = () => `${config.apiBaseUrl}${API_BASE_PATH}`;

async function doSilentRefresh(): Promise<void> {
  // REPLACE_WITH_API: POST /api/v1/auth/refresh
  if (config.useMockApi) {
    if (!hasMockSession()) {
      throw new Error('[Auth] No mock session');
    }
    setAccessToken(MOCK_ACCESS_TOKEN);
    useAuthStore.getState().setUser(MOCK_USER);
    scheduleTokenRefresh();
    return;
  }

  const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.REFRESH}`, {
    method: 'POST',
    timeout: HTTP.REFRESH_TIMEOUT,
  });

  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ?? `Refresh failed (${response.status})`;
    throw new Error(message);
  }
  const { accessToken } = authTokenResponseSchema.parse(data);
  setAccessToken(accessToken);

  // Fetch and cache user profile — roll back token if this fails
  try {
    const user = await getCurrentUser();
    useAuthStore.getState().setUser(user);
  } catch (error) {
    clearAccessToken();
    throw error;
  }

  // Schedule proactive refresh for this new token
  scheduleTokenRefresh();
}

/**
 * Fetch the current authenticated user's profile.
 * Uses raw fetch with the token manually injected.
 */
async function getCurrentUser(): Promise<AuthUser> {
  const token = getAccessToken();

  if (!token) {
    throw new Error('[Auth] No access token available for getCurrentUser');
  }

  const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.ME}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ??
      `Profile fetch failed (${response.status})`;
    throw new Error(message);
  }
  return authUserSchema.parse(data);
}

/**
 * Logout — clear all auth state and redirect.
 */
export async function logout(): Promise<void> {
  // REPLACE_WITH_API: POST /api/v1/auth/logout
  if (config.useMockApi) {
    forceLogout();
    return;
  }
  try {
    await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.LOGOUT}`, {
      method: 'POST',
    });
  } catch {
    // Best-effort logout — even if backend call fails, clear local state
  } finally {
    forceLogout();
  }
}

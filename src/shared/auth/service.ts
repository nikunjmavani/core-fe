import {
  API_BASE_PATH,
  API_ENDPOINTS,
  AUTH_ROUTES,
  HTTP,
} from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { queryClient } from '@/core/http/queryClient.ts';
import { broadcastLogout } from '@/shared/auth/auth-channel.ts';
import {
  endMockSession,
  hasMockSession,
  MOCK_ACCESS_TOKEN,
  MOCK_USER,
} from '@/shared/auth/mock-auth.ts';
import { cancelTokenRefresh, scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { clearSessionStart, markSessionStart } from '@/shared/auth/session-lifetime.ts';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/shared/auth/token.ts';
import { authTokenResponseSchema, authUserSchema } from '@/shared/auth/types.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import {
  fetchMeContext,
  type MeContext,
  meContextQueryKey,
} from '@/shared/tenancy/me-context.ts';

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

/** Clear ALL local auth state (token, mock session, store, query cache). */
function clearLocalAuthState(): void {
  try {
    cancelTokenRefresh();
    clearAccessToken();
    clearSessionStart();
    endMockSession();
    useAuthStore.getState().clearAuth();
    queryClient.clear();
  } catch (cleanupError) {
    if (import.meta.env.DEV) {
      console.error('[Auth] Cleanup failed during logout', cleanupError);
    }
  }
}

/**
 * Shared logout helper — clears ALL auth state and redirects to login.
 * Used by both the manual `logout()` flow and the fetch client's
 * refresh-failure path. Also broadcasts to sibling tabs so a dead session
 * (admin-suspend, logout-all, expiry) logs every open tab out at once.
 */
export function forceLogout(): void {
  clearLocalAuthState();
  broadcastLogout();
  window.location.href = AUTH_ROUTES.LOGIN;
}

/**
 * Cross-tab logout receiver — invoked when ANOTHER tab broadcasts a logout.
 * Clears local state and redirects, but never re-broadcasts (loop guard).
 * Skips the redirect when already on the login page so an idle login tab is
 * not pointlessly reloaded.
 *
 * @remarks
 * Wired once at boot via `subscribeToAuthBroadcast` in `main.tsx`. The
 * broadcast carries only the logout signal — never the token — so each tab
 * clears its own in-memory closure independently.
 */
export function handleCrossTabLogout(): void {
  clearLocalAuthState();
  if (window.location.pathname !== AUTH_ROUTES.LOGIN) {
    window.location.href = AUTH_ROUTES.LOGIN;
  }
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

let tokenRefreshPromise: Promise<void> | null = null;

/**
 * THE single-flight token refresh — the only code path that calls
 * `/auth/refresh`. Both the proactive timer (via {@link silentRefresh}) and
 * the fetch client's 401 interceptor consume this promise, so the two can
 * never race each other into parallel refreshes.
 *
 * @remarks
 * The backend rotates the refresh session on every refresh and treats a
 * concurrent reuse of the old cookie as theft (reuse-detection kills the
 * session). That makes parallelism the failure mode twice over: within a tab
 * (timer vs 401) the module promise serializes callers, and ACROSS tabs the
 * network call is wrapped in `navigator.locks` ('core-auth:refresh') so N
 * tabs refreshing at the same instant — every tab schedules its timer off
 * the same token expiry — take turns instead of tripping reuse-detection.
 * Falls back to the plain call where Web Locks is unavailable.
 */
export async function refreshAccessToken(): Promise<void> {
  if (tokenRefreshPromise) return tokenRefreshPromise;
  tokenRefreshPromise = runExclusiveRefresh().finally(() => {
    tokenRefreshPromise = null;
  });
  return tokenRefreshPromise;
}

async function runExclusiveRefresh(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('core-auth:refresh', () => doTokenRefresh());
  }
  return doTokenRefresh();
}

async function doTokenRefresh(): Promise<void> {
  // REPLACE_WITH_API: POST /api/v1/auth/refresh
  if (config.useMockApi) {
    if (!hasMockSession()) {
      throw new Error('[Auth] No mock session');
    }
    setAccessToken(MOCK_ACCESS_TOKEN);
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

  // Schedule proactive refresh for this new token
  scheduleTokenRefresh();
}

async function doSilentRefresh(): Promise<void> {
  await refreshAccessToken();

  if (config.useMockApi) {
    useAuthStore.getState().setUser(MOCK_USER);
    return;
  }

  // Fetch and cache user profile — roll back token if this fails
  try {
    const user = await getCurrentUser();
    useAuthStore.getState().setUser(user);
  } catch (error) {
    clearAccessToken();
    throw error;
  }
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

/** Map the authoritative me/context payload → the lightweight header AuthUser. */
function meContextToAuthUser(ctx: MeContext): AuthUser {
  const name = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ');
  return {
    id: ctx.user.id,
    email: ctx.user.email,
    role: ctx.globalRole ?? 'user',
    name: name.length > 0 ? name : undefined,
    avatarUrl: ctx.user.avatarUrl ?? undefined,
    organizationId: ctx.activeOrganization?.id,
  };
}

/**
 * Establish a fully authenticated session from a freshly minted access token —
 * the single post-auth completion path shared by login, register, magic-link,
 * and OAuth. Stores the token, starts the idle-session clock, then loads the
 * authoritative session context (`GET /auth/me/context`) and seeds the React
 * Query cache so the app has user + active-org + permissions with no extra
 * round-trip, sets the header user, and schedules proactive refresh. Rolls the
 * token back if the context load fails so auth state is never half-initialised.
 */
export async function establishSession(accessToken: string): Promise<void> {
  setAccessToken(accessToken);
  markSessionStart();
  if (config.useMockApi) {
    useAuthStore.getState().setUser(MOCK_USER);
    scheduleTokenRefresh();
    return;
  }
  try {
    const ctx = await fetchMeContext();
    queryClient.setQueryData(meContextQueryKey, ctx);
    useAuthStore.getState().setUser(meContextToAuthUser(ctx));
    scheduleTokenRefresh();
  } catch (error) {
    clearAccessToken();
    clearSessionStart();
    throw error;
  }
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

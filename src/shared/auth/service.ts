import {
  API_BASE_PATH,
  API_ENDPOINTS,
  AUTH_ROUTES,
  HTTP,
} from '@/core/config/constants.ts';
import { platformConfig } from '@/core/config/env.ts';
import { queryClient } from '@/core/http/queryClient.ts';
import { ANALYTICS_EVENTS } from '@/shared/analytics/analytics.constants.ts';
import { captureAnalyticsEvent } from '@/shared/analytics/capture.ts';
import { broadcastLogout } from '@/shared/auth/auth-channel.ts';
import { cancelTokenRefresh, scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { clearSessionStart, markSessionStart } from '@/shared/auth/session-lifetime.ts';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/shared/auth/token.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import type { MeContext } from '@/shared/tenancy/me-context.ts';
import { hydrateSessionContext } from '@/shared/tenancy/session-context.ts';

import type { AuthUser } from './types.ts';

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

function clearLocalAuthState(): void {
  try {
    cancelTokenRefresh();
    clearAccessToken();
    clearSessionStart();
    useAuthStore.getState().clearAuth();
    queryClient.clear();
  } catch (cleanupError) {
    if (import.meta.env.DEV) {
      console.error('[Auth] Cleanup failed during logout', cleanupError);
    }
  }
}

export function forceLogout(
  opts: { reason?: 'force_logout' | 'logout' | 'cross_tab' } = {},
): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.sessionEnded, {
    reason: opts.reason ?? 'force_logout',
  });
  clearLocalAuthState();
  broadcastLogout();
  window.location.href = AUTH_ROUTES.LOGIN;
}

export function handleCrossTabLogout(): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.sessionEnded, { reason: 'cross_tab' });
  clearLocalAuthState();
  if (window.location.pathname !== AUTH_ROUTES.LOGIN) {
    window.location.href = AUTH_ROUTES.LOGIN;
  }
}

let refreshPromise: Promise<void> | null = null;

export async function silentRefresh(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doSilentRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

let authBootstrapPromise: Promise<void> | null = null;

export function startAuthBootstrap(): Promise<void> {
  if (!authBootstrapPromise) {
    authBootstrapPromise = (async () => {
      try {
        await silentRefresh();
      } catch {
        const { isAuthenticated } = useAuthStore.getState();
        if (!(isAuthenticated || getAccessToken())) {
          if (import.meta.env.DEV) {
            console.info('[Bootstrap] No active session');
          }
          useAuthStore.getState().clearAuth();
        }
      } finally {
        if (useAuthStore.getState().isLoading) {
          useAuthStore.getState().setLoading(false);
        }
      }
    })();
  }
  return authBootstrapPromise;
}

export async function awaitAuthBootstrap(): Promise<void> {
  await startAuthBootstrap();
}

const authBase = () => `${platformConfig.apiBaseUrl}${API_BASE_PATH}`;

let tokenRefreshPromise: Promise<void> | null = null;

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
  const response = await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.REFRESH}`, {
    method: 'POST',
    timeout: HTTP.REFRESH_TIMEOUT,
  });

  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const envelope = data as { message?: string; error?: { detail?: string } };
    const message =
      envelope?.error?.detail ??
      envelope?.message ??
      `Refresh failed (${response.status})`;
    throw new Error(message);
  }

  const payload =
    data && typeof data === 'object' && 'data' in data
      ? (data as { data: unknown }).data
      : data;
  const raw = payload as { access_token?: string; accessToken?: string } | null;
  const token = raw?.access_token ?? raw?.accessToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(`Refresh failed (${response.status})`);
  }
  setAccessToken(token);
  scheduleTokenRefresh();
}

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

async function hydrateSessionFromContext(): Promise<void> {
  const ctx = await hydrateSessionContext();
  useAuthStore.getState().setUser(meContextToAuthUser(ctx));
}

async function doSilentRefresh(): Promise<void> {
  await refreshAccessToken();
  try {
    await hydrateSessionFromContext();
  } catch (error) {
    clearAccessToken();
    throw error;
  }
}

export async function establishSession(accessToken: string): Promise<void> {
  setAccessToken(accessToken);
  markSessionStart();
  try {
    await hydrateSessionFromContext();
    scheduleTokenRefresh();
  } catch (error) {
    clearAccessToken();
    clearSessionStart();
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await authFetch(`${authBase()}${API_ENDPOINTS.AUTH.LOGOUT}`, {
      method: 'POST',
    });
  } catch {
    /* best-effort */
  } finally {
    forceLogout({ reason: 'logout' });
  }
}

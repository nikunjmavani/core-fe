/**
 * Proactive token refresh timer.
 *
 * Instead of waiting for a 401, this module schedules a silent refresh
 * ~60 seconds before the access token expires. This eliminates the
 * brief failure-and-retry cycle that happens with reactive 401 handling.
 *
 * Flow:
 *   1. After login or refresh, call `scheduleTokenRefresh()`.
 *   2. Timer fires `BUFFER_MS` before `exp` claim.
 *   3. If user is on a different tab (document hidden), defer until tab becomes visible.
 *   4. On success, reschedule for the new token's expiry.
 *   5. On failure, fall back to the 401 interceptor (which will force logout).
 */

import { silentRefresh } from '@/shared/auth/service.ts';
import { getTokenExpiry } from '@/shared/auth/token.ts';

/** Refresh this many ms before token expiry */
const BUFFER_MS = 60_000;

/** Minimum delay to prevent runaway loops */
const MIN_DELAY_MS = 5_000;

let refreshTimerId: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule the next proactive refresh based on the current token's `exp` claim.
 * Safe to call multiple times — cancels any existing timer first.
 */
export function scheduleTokenRefresh(): void {
  cancelTokenRefresh();

  const exp = getTokenExpiry();
  if (exp === null) return; // No token or no exp — nothing to schedule

  const expiresAt = exp * 1000; // convert to ms
  const delay = Math.max(expiresAt - Date.now() - BUFFER_MS, MIN_DELAY_MS);

  refreshTimerId = setTimeout(async () => {
    // If tab is hidden, defer until it becomes visible
    if (document.hidden) {
      const onVisible = () => {
        document.removeEventListener('visibilitychange', onVisible);
        void doProactiveRefresh();
      };
      document.addEventListener('visibilitychange', onVisible);
      return;
    }

    void doProactiveRefresh();
  }, delay);

  if (import.meta.env.DEV) {
    console.info(
      `[RefreshTimer] Scheduled refresh in ${Math.round(delay / 1000)}s (token expires in ${Math.round((expiresAt - Date.now()) / 1000)}s)`,
    );
  }
}

async function doProactiveRefresh(): Promise<void> {
  try {
    await silentRefresh();
    // Reschedule for the new token's expiry
    scheduleTokenRefresh();
  } catch {
    // silentRefresh failed — the 401 interceptor will handle the next request
    if (import.meta.env.DEV) {
      console.warn('[RefreshTimer] Proactive refresh failed — will retry on next 401');
    }
  }
}

/** Cancel any pending refresh timer. Called on logout. */
export function cancelTokenRefresh(): void {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

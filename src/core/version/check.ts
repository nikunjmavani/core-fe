/**
 * Version check service — detects new deployments and auto-reloads the browser
 * to the latest CDN build, but only at a moment that won't destroy in-flight work.
 *
 * In production only:
 * - Polls /version.json periodically (cache-busting query param) + on tab refocus.
 * - When the advertised buildId differs from the one the app was built with, it
 *   marks a reload **pending** instead of reloading immediately, then applies it
 *   the moment it's *safe*:
 *     • never while the user is editing a field (input/textarea/select/CE),
 *     • immediately when the tab is hidden (the reload is invisible),
 *     • otherwise once the user has gone idle (no input for IDLE_AFTER_MS) or
 *       returns to the tab.
 *
 * Users get fresh code after a release without a jarring mid-task reload.
 */

const POLL_INTERVAL_MS = 60_000; // 1 minute
const IDLE_AFTER_MS = 60_000; // consider the user idle after 60s with no input
const SAFE_RECHECK_MS = 10_000; // while a reload is pending, re-test safety this often

/** Input gestures that count as "the user is active" (reset the idle clock). */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

let initialized = false;

function getVersionUrl(): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') || '';
  return `${base}/version.json`;
}

type VersionPayload = { buildId: string; builtAt: string };

function getCurrentBuildId(): string | undefined {
  return (import.meta.env.VITE_APP_BUILD_ID as string | undefined) ?? undefined;
}

async function fetchVersion(): Promise<VersionPayload | null> {
  try {
    const url = `${getVersionUrl()}?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as VersionPayload;
    return typeof data?.buildId === 'string' ? data : null;
  } catch {
    return null;
  }
}

function shouldReload(
  latest: VersionPayload | null,
  current: string | undefined,
): boolean {
  if (!(latest && current)) return false;
  return latest.buildId !== current;
}

/** True when focus is in an editable field — reloading would lose what they're typing. */
function isEditableElementFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
  );
}

/**
 * Reload-loop guard: remember (per tab) which buildId we already reloaded
 * for. If the mismatch survives a reload — index.html served stale by an
 * intermediary cache, or a half-propagated deploy — reloading again would
 * loop forever, so we stand down until version.json advertises a NEWER
 * buildId. sessionStorage access can throw (privacy modes); failing open
 * means at worst one extra reload, never a loop.
 */
const RELOADED_FOR_KEY = 'core:version-check:reloaded-for';

function alreadyReloadedFor(buildId: string): boolean {
  try {
    return sessionStorage.getItem(RELOADED_FOR_KEY) === buildId;
  } catch {
    return false;
  }
}

function markReloadedFor(buildId: string): void {
  try {
    sessionStorage.setItem(RELOADED_FOR_KEY, buildId);
  } catch {
    // Best effort — without the marker we may reload twice, never loop-free worse.
  }
}

/**
 * Start the version check. Only runs in production.
 * Call once from main.tsx after app bootstrap.
 *
 * Returns a cleanup function that removes listeners and stops polling, or
 * undefined if version checking was not started.
 */
export function startVersionCheck(): (() => void) | undefined {
  if (initialized || import.meta.env.DEV || import.meta.env.MODE === 'test') return;

  const currentBuildId = getCurrentBuildId();
  if (!currentBuildId) return;

  initialized = true;

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let safetyTimer: ReturnType<typeof setInterval> | null = null;
  let pendingBuildId: string | null = null;
  let lastActivityAt = Date.now();

  const markActivity = () => {
    lastActivityAt = Date.now();
  };

  // Reloading is "safe" when it won't throw away in-flight work.
  function safeToReload(): boolean {
    if (isEditableElementFocused()) return false; // never interrupt active editing
    if (document.visibilityState === 'hidden') return true; // away → invisible reload
    return Date.now() - lastActivityAt >= IDLE_AFTER_MS; // otherwise wait for idle
  }

  function applyReload(buildId: string): void {
    markReloadedFor(buildId);
    pendingBuildId = null;
    stopSafetyWatch();
    if (import.meta.env.DEV) {
      console.info('[VersionCheck] Applying deferred reload for', buildId);
    }
    window.location.reload();
  }

  function tryPendingReload(): void {
    if (pendingBuildId && safeToReload()) applyReload(pendingBuildId);
  }

  function startSafetyWatch(): void {
    if (safetyTimer) return;
    safetyTimer = setInterval(tryPendingReload, SAFE_RECHECK_MS);
  }

  function stopSafetyWatch(): void {
    if (safetyTimer) {
      clearInterval(safetyTimer);
      safetyTimer = null;
    }
  }

  async function checkForUpdate(): Promise<void> {
    const latest = await fetchVersion();
    if (!(latest && shouldReload(latest, currentBuildId))) return;

    if (alreadyReloadedFor(latest.buildId)) {
      // Reloaded for this deployment already and STILL on the old build —
      // something upstream serves index.html stale. Don't loop.
      console.warn(
        '[VersionCheck] Still on the old build after reloading for',
        latest.buildId,
        '— suppressing further reloads for this deployment.',
      );
      return;
    }

    // New deployment detected — defer the reload until it's safe (idle / hidden).
    pendingBuildId = latest.buildId;
    if (import.meta.env.DEV) {
      console.info('[VersionCheck] New deployment detected; will reload when idle…');
    }
    startSafetyWatch();
    tryPendingReload();
  }

  function schedulePoll(): void {
    if (pollTimer) return;
    pollTimer = setInterval(checkForUpdate, POLL_INTERVAL_MS);
  }

  function stopPoll(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // Initial check after a short delay (avoid blocking bootstrap).
  const initialCheck = setTimeout(checkForUpdate, 5_000);

  // Poll while the tab is visible.
  schedulePoll();

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      // Returned to the tab — re-check and apply any pending reload (a refocus
      // is a natural break point).
      void checkForUpdate();
      schedulePoll();
      tryPendingReload();
    } else {
      stopPoll();
      // Tab hidden — a pending reload is now invisible, so take it.
      tryPendingReload();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  for (const evt of ACTIVITY_EVENTS) {
    window.addEventListener(evt, markActivity, { passive: true });
  }

  return () => {
    clearTimeout(initialCheck);
    stopPoll();
    stopSafetyWatch();
    document.removeEventListener('visibilitychange', onVisibility);
    for (const evt of ACTIVITY_EVENTS) {
      window.removeEventListener(evt, markActivity);
    }
    initialized = false;
  };
}

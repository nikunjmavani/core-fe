/**
 * Version check service — detects new deployments and auto-reloads the browser.
 *
 * In production only:
 * - Polls /version.json periodically (with cache-busting query param)
 * - Checks when user returns to tab (visibilitychange)
 * - If buildId differs from the one the app was built with → location.reload()
 *
 * Ensures users get fresh code after a release without manual refresh.
 */

const POLL_INTERVAL_MS = 60_000; // 1 minute

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
  if (!latest || !current) return false;
  return latest.buildId !== current;
}

/**
 * Start the version check. Only runs in production.
 * Call once from main.tsx after app bootstrap.
 *
 * Returns a cleanup function that removes the event listener and stops polling,
 * or undefined if version checking was not started.
 */
export function startVersionCheck(): (() => void) | undefined {
  if (initialized || import.meta.env.DEV || import.meta.env.MODE === 'test') return;

  const currentBuildId = getCurrentBuildId();
  if (!currentBuildId) return;

  initialized = true;

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function checkAndReload(): Promise<void> {
    const latest = await fetchVersion();
    if (shouldReload(latest, currentBuildId)) {
      if (import.meta.env.DEV) {
        console.info('[VersionCheck] New deployment detected, reloading…');
      }
      window.location.reload();
    }
  }

  function schedulePoll(): void {
    if (pollTimer) return;
    pollTimer = setInterval(checkAndReload, POLL_INTERVAL_MS);
  }

  function stopPoll(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // Initial check after a short delay (avoid blocking bootstrap)
  setTimeout(checkAndReload, 5_000);

  // Poll when tab is visible
  schedulePoll();

  // Check immediately when user returns to tab
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkAndReload();
      schedulePoll();
    } else {
      stopPoll();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Return cleanup handle
  return () => {
    stopPoll();
    document.removeEventListener('visibilitychange', onVisibility);
    initialized = false;
  };
}

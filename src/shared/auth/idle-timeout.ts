/**
 * Idle session timeout.
 *
 * Tracks intentional user activity (click, key, touch) and triggers
 * a warning callback when the user has been idle for `warnAfterMs`.
 * If the user does not interact within the grace period (`logoutAfterMs - warnAfterMs`),
 * the logout callback fires.
 *
 * Usage:
 *   const cleanup = startIdleTimeout({
 *     warnAfterMs: 25 * 60 * 1000,   // warn after 25 min
 *     logoutAfterMs: 30 * 60 * 1000,  // logout after 30 min
 *     onWarn: () => showWarningDialog(),
 *     onLogout: () => forceLogout(),
 *     onActive: () => hideWarningDialog(),
 *   });
 *
 *   // Call cleanup() on unmount or logout
 */

interface IdleTimeoutOptions {
  /** Milliseconds of idle time before showing warning */
  warnAfterMs: number;
  /** Milliseconds of idle time before forced logout */
  logoutAfterMs: number;
  /** Called when idle threshold reached (show warning dialog) */
  onWarn: () => void;
  /** Called when logout threshold reached */
  onLogout: () => void;
  /** Called when user becomes active again during warning phase */
  onActive?: () => void;
}

const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  'mousedown',
  'click',
  'keydown',
  'touchstart',
];

/** Throttle activity resets to avoid excessive timer restarts */
const THROTTLE_MS = 10_000;

export function startIdleTimeout(options: IdleTimeoutOptions): () => void {
  const { warnAfterMs, logoutAfterMs, onWarn, onLogout, onActive } = options;

  let warnTimer: ReturnType<typeof setTimeout> | null = null;
  let logoutTimer: ReturnType<typeof setTimeout> | null = null;
  let isWarning = false;
  let lastActivity = Date.now();

  function clearTimers() {
    if (warnTimer) {
      clearTimeout(warnTimer);
      warnTimer = null;
    }
    if (logoutTimer) {
      clearTimeout(logoutTimer);
      logoutTimer = null;
    }
  }

  function startTimers() {
    clearTimers();
    lastActivity = Date.now();

    warnTimer = setTimeout(() => {
      isWarning = true;
      onWarn();
    }, warnAfterMs);

    logoutTimer = setTimeout(() => {
      onLogout();
    }, logoutAfterMs);
  }

  function handleActivity() {
    // Throttle: don't reset timers for every micro-event
    if (Date.now() - lastActivity < THROTTLE_MS) return;

    if (isWarning) {
      isWarning = false;
      onActive?.();
    }

    startTimers();
  }

  // Bind activity listeners
  const controller = new AbortController();
  for (const event of ACTIVITY_EVENTS) {
    document.addEventListener(event, handleActivity, {
      passive: true,
      signal: controller.signal,
    });
  }

  // Start initial timers
  startTimers();

  // Return cleanup function
  return () => {
    clearTimers();
    controller.abort();
  };
}

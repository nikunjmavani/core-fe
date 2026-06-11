import type { AuthUser } from './types.ts';

/**
 * Mock authentication primitives used while the backend is not wired
 * (`config.useMockApi`). A "session" is a flag in localStorage so a mocked login
 * survives page reloads; the in-memory access token is re-minted on bootstrap.
 *
 * Remove this module (and its call sites, tagged `REPLACE_WITH_API`) once the
 * real auth backend is connected.
 */

/** Placeholder access token returned by the mock auth endpoints. */
export const MOCK_ACCESS_TOKEN = 'mock.access.token';

/** The mock signed-in user. */
export const MOCK_USER: AuthUser = {
  id: 'u_1',
  email: 'you@acme.test',
  role: 'user',
  name: 'You',
};

const SESSION_KEY = 'core-mock-session';

/** Mark a mock session as active (called on successful mock login). */
export function startMockSession(): void {
  try {
    localStorage.setItem(SESSION_KEY, '1');
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

/** Clear the mock session (called on logout). */
export function endMockSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Whether a mock session is currently active. */
export function hasMockSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Complete a mock sign-in (used by social/passkey/magic-link entry points and
 * the OAuth callback). Sets the in-memory token, starts a mock session, sets the
 * user, and schedules refresh. Side-effectful — call then navigate.
 */
export async function performMockLogin(): Promise<void> {
  const [{ setAccessToken }, { scheduleTokenRefresh }, { useAuthStore }] =
    await Promise.all([
      import('@/shared/auth/token.ts'),
      import('@/shared/auth/refresh-timer.ts'),
      import('@/shared/store/useAuthStore/index.ts'),
    ]);
  setAccessToken(MOCK_ACCESS_TOKEN);
  startMockSession();
  useAuthStore.getState().setUser(MOCK_USER);
  scheduleTokenRefresh();
}

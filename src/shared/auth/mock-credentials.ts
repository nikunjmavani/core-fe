/**
 * Demo credentials used only when `config.useMockApi` is true (development).
 * Reject all other email/password pairs so login errors and E2E behave realistically.
 */
export const MOCK_LOGIN_EMAIL = 'demo@acme.test';

/** Dev-only demo password when `useMockApi` is on — not used in production builds. */
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- intentional mock credential for local/E2E
export const MOCK_LOGIN_PASSWORD = 'Password1!';

/** Whether the submitted credentials match the mock demo account. */
export function isMockLoginValid(data: { email: string; password: string }): boolean {
  const email = data.email.trim().toLowerCase();
  return (
    email === MOCK_LOGIN_EMAIL.toLowerCase() && data.password === MOCK_LOGIN_PASSWORD
  );
}

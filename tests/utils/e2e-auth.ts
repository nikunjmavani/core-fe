import { expect, type Page } from '@playwright/test';

/** Password that satisfies register schema (min 8 characters). */
const E2E_REGISTER_PASSWORD = 'Password1!';

/**
 * Registers a new user via the UI and enters the mock organization's dashboard.
 * Uses a unique email per run so tests can run in parallel or re-run without
 * "email already taken". No env vars or pre-seeded data required.
 *
 * Flow under dual-URL routing: register → `/` resolver reads `me/context`'s
 * active organization (the mock's `acme` team org) and lands straight on
 * `/organization/org_acme/dashboard` — no picker step (the active org is known
 * from the session, FE-19).
 */
export async function registerNewUserAndGoToDashboard(page: Page): Promise<void> {
  const uniqueEmail = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@example.com`;
  await page.goto('/register');
  await page.getByTestId('register-email').fill(uniqueEmail);
  await page.getByTestId('register-password').fill(E2E_REGISTER_PASSWORD);
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/organization\/org_acme\/dashboard/, {
    timeout: 10000,
  });
}

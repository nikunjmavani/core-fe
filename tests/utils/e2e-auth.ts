import { expect, type Page } from '@playwright/test';

/** Password that satisfies register schema (min 8 characters). */
const E2E_REGISTER_PASSWORD = 'Password1!';

/**
 * Registers a new user via the UI and waits for redirect to dashboard.
 * Uses a unique email per run so tests can run in parallel or re-run without "email already taken".
 * No env vars or pre-seeded data required.
 */
export async function registerNewUserAndGoToDashboard(page: Page): Promise<void> {
  const uniqueEmail = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@example.com`;
  await page.goto('/register');
  await page.getByTestId('register-email').fill(uniqueEmail);
  await page.getByTestId('register-password').fill(E2E_REGISTER_PASSWORD);
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL('/', { timeout: 10000 });
}

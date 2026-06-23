import { expect, test } from '@playwright/test';

/**
 * UI integration e2e: drives the actual FE UI while it is pointed at the
 * running core-be. The FE dev server must run against the backend (it proxies
 * `/api` to http://localhost:3000 via vite.config `server.proxy`):
 *
 *   VITE_USE_MOCK_API=false pnpm dev          # terminal 1
 *   E2E_INTEGRATION=1 pnpm exec playwright test tests/e2e/app.integration.test.ts
 *
 * Gated behind E2E_INTEGRATION=1 so it never runs in the default mock e2e suite
 * (where the login form resolves client-side and makes no /auth/login call).
 */
// Read the gate via globalThis so this spec type-checks under tsconfig.app.json
// (which has no Node `process` types) while still reading the env at runtime.
const INTEGRATION =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.E2E_INTEGRATION === '1';

test.describe('UI integration (FE → core-be)', () => {
  test.skip(
    !INTEGRATION,
    'set E2E_INTEGRATION=1 and run the FE with VITE_USE_MOCK_API=false',
  );

  test('[-] invalid login calls core-be and surfaces the 401', async ({ page }) => {
    let loginStatus = 0;
    page.on('response', (res) => {
      if (res.url().includes('/api/v1/auth/login')) loginStatus = res.status();
    });

    await page.goto('/login');
    await page.getByTestId('login-email').fill(`nobody-${Date.now()}@acme.test`);
    await page.getByTestId('login-password').fill('definitely-wrong-1');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 10_000 });
    // Proves the UI actually hit the backend — mock mode makes no such call.
    expect(loginStatus).toBe(401);
  });

  test('[+] signup through the UI lands on an org dashboard', async ({ page }) => {
    const stamp = Date.now();
    // Unique + 3 char classes (backend policy) + NOT a breached pattern (the FE
    // HIBP meter disables submit on a breached password — e.g. anything "Passw0rd").
    const email = `fe-e2e-${stamp}@acme.test`;
    await page.goto('/register');
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill(`Zq7!${stamp}xK`);
    await page.getByTestId('register-submit').click();

    // Fresh signup auto-creates exactly one (personal) org → the resolver skips
    // the picker and lands on that org's dashboard. The id is an org_<21>.
    await expect(page).toHaveURL(/\/organization\/org_[a-z0-9]+\/dashboard/, {
      timeout: 20_000,
    });
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });
});

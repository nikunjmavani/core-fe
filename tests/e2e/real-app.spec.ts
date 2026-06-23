import { expect, test } from '@playwright/test';

/**
 * Real-stack UI e2e: drives the actual FE UI while it is pointed at the LIVE
 * core-be. The FE dev server must be running in real mode (it proxies `/api`
 * to http://localhost:3000 via vite.config `server.proxy`):
 *
 *   VITE_USE_MOCK_API=false pnpm dev          # terminal 1
 *   E2E_REAL=1 pnpm exec playwright test tests/e2e/real-app.spec.ts
 *
 * Gated behind E2E_REAL=1 so it never runs in the default mock e2e suite
 * (where the login form resolves client-side and makes no /auth/login call).
 */
// Read the gate via globalThis so this spec type-checks under tsconfig.app.json
// (which has no Node `process` types) while still reading the env at runtime.
const REAL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.E2E_REAL === '1';

test.describe('Real-stack UI (FE → live core-be)', () => {
  test.skip(!REAL, 'set E2E_REAL=1 and run the FE with VITE_USE_MOCK_API=false');

  test('[-] invalid login calls core-be and surfaces the real 401', async ({ page }) => {
    let loginStatus = 0;
    page.on('response', (res) => {
      if (res.url().includes('/api/v1/auth/login')) loginStatus = res.status();
    });

    await page.goto('/login');
    await page.getByTestId('login-email').fill(`nobody-${Date.now()}@acme.test`);
    await page.getByTestId('login-password').fill('definitely-wrong-1');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 10_000 });
    // Proves the UI actually hit the live backend — mock mode makes no such call.
    expect(loginStatus).toBe(401);
  });
});

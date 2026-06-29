import { expect, test } from '@playwright/test';

import { expectLoginFormReady } from '@/tests/utils/e2e-hybrid.ts';

test.describe('Navigation', () => {
  test('unknown routes show 404 page', async ({ page }) => {
    await page.goto('/some-nonexistent-page');
    await expect(page.getByTestId('not-found-page')).toBeVisible({ timeout: 5000 });
  });

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    for (const path of ['/', '/dashboard', '/onboarding', '/organization'] as const) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
      await expectLoginFormReady(page);
    }
  });

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto('/login');
    await expectLoginFormReady(page);
  });

  test('MFA page is accessible without auth', async ({ page }) => {
    await page.goto('/mfa');
    await expect(page.getByTestId('mfa-page')).toBeVisible();
  });

  test('unauthorized page is accessible without auth', async ({ page }) => {
    await page.goto('/unauthorized');
    await expect(page.getByTestId('unauthorized-page')).toBeVisible();
  });

  test('accept-invite route is reachable without auth', async ({ page }) => {
    await page.goto('/accept-invite/inv_expired');
    await expect(page.getByTestId('accept-invite-page')).toBeVisible();
  });
});

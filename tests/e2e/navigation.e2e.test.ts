import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test('unknown routes show 404 page', async ({ page }) => {
    await page.goto('/some-nonexistent-page');
    await expect(page.getByTestId('not-found-page')).toBeVisible({ timeout: 5000 });
  });

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-form')).toBeVisible();
  });

  test('personal /dashboard route exists and is auth-guarded (FE-21)', async ({
    page,
  }) => {
    // The personal-org space lives at the root `/dashboard` URL (dual-URL).
    // Unauthenticated access is bounced to login by the session gate.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

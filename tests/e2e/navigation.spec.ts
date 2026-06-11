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
});

import { expect, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';

test.describe('Visual Regression', () => {
  test('login page (light mode)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page).toHaveScreenshot('login-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('login page (dark mode)', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page).toHaveScreenshot('login-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('dashboard page', async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
    await expect(page.getByTestId('dashboard-page')).toBeVisible();

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

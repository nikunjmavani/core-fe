import { expect, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';
import { expectAuthScreenReady, gotoApp } from '@/tests/utils/e2e-hybrid.ts';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('Visual Regression', () => {
  test('login page (light mode)', async ({ page }) => {
    await gotoApp(page, '/login');
    await expectAuthScreenReady(page);
    await expect(page).toHaveScreenshot('login-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('login page (dark mode)', async ({ page }) => {
    await gotoApp(page, '/login');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expectAuthScreenReady(page);
    await expect(page).toHaveScreenshot('login-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('login page (theme extremes — floating elevation + glow focus)', async ({
    page,
  }) => {
    await gotoApp(page, '/login');
    await page.evaluate(() => {
      document.documentElement.dataset.elevation = 'floating';
      document.documentElement.dataset.focus = 'glow';
    });
    await expectAuthScreenReady(page);
    await expect(page).toHaveScreenshot('login-theme-extremes.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('login page (dark + hairline separation)', async ({ page }) => {
    await gotoApp(page, '/login');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.dataset.separation = 'hairline';
      document.documentElement.dataset.menu = 'glass';
    });
    await expectAuthScreenReady(page);
    await expect(page).toHaveScreenshot('login-dark-glass-hairline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('dashboard page', async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      animations: 'disabled',
    });
  });
});

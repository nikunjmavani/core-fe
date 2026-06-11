import { expect, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';

// Entrance animations (framer-motion fades, AuthLayout dot grid) make raw
// screenshots timing-sensitive under parallel workers: emulate reduced motion
// and freeze CSS animations so captures are deterministic.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('Visual Regression', () => {
  test('login page (light mode)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page).toHaveScreenshot('login-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('login page (dark mode)', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page).toHaveScreenshot('login-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('dashboard page', async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
    await expect(page.getByTestId('dashboard-page')).toBeVisible();

    // Dashboard renders randomized mock fixtures; the diff budget absorbs the
    // changing numbers while still catching layout/theme regressions.
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });
});

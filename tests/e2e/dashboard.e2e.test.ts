import { expect, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';
import { expectAppHeaderReady } from '@/tests/utils/e2e-hybrid.ts';

// The dashboard module is a placeholder until it is rebuilt after auth
// (REPLACE_WITH_MODULE) — these specs cover the shell + placeholder only.
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
  });

  test('displays the placeholder page', async ({ page }) => {
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    await expect(page.getByTestId('dashboard-greeting')).toBeVisible();
  });

  test('header elements are visible (hybrid)', async ({ page }) => {
    await expectAppHeaderReady(page);
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });

  test('the sidebar Settings quick-link opens the settings modal over the dashboard', async ({
    page,
  }) => {
    await page.getByTestId('sidebar-settings').click();
    await expect(page.getByTestId('settings-modal')).toBeVisible();
    await expect(page).toHaveURL(/#settings\/account\/profile$/);
    // Dashboard stays mounted behind the modal.
    await expect(page.getByTestId('dashboard-page')).toBeAttached();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('settings-modal')).not.toBeVisible();
    await expect(page).not.toHaveURL(/#settings/);
  });

  test('the user menu exposes Settings and Logout actions', async ({ page }) => {
    await page.getByTestId('user-menu-trigger').click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByTestId('user-menu-settings')).toBeVisible();
    await expect(page.getByTestId('logout-button')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
  });
});

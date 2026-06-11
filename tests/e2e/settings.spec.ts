import { expect, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';

// Settings is a global hash-driven modal (#settings/<scope>/<section>) — not a
// route space. See shared/components/SettingsModal/ and routing-and-tenancy.md §7.
test.describe('Settings modal (hash-driven)', () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
  });

  test('opens from the user menu and writes the hash', async ({ page }) => {
    await page.getByTestId('user-menu-trigger').click();
    await expect(page.getByTestId('user-menu-settings')).toBeVisible();
    // Keyboard activation: Radix positions the portal menu in a way Playwright
    // sometimes reports as outside the viewport; arrow+enter is deterministic.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('settings-modal')).toBeVisible();
    await expect(page).toHaveURL(/#settings\/account\/profile$/);
  });

  test('deep link opens the requested section over the page', async ({ page }) => {
    await page.goto('/organization/org_acme/dashboard#settings/account/security');

    await expect(page.getByTestId('settings-modal')).toBeVisible();
    await expect(page.getByTestId('settings-section-security')).toBeVisible();
    // The page behind the modal stays mounted — hash changes never re-run routing.
    await expect(page.getByTestId('dashboard-page')).toBeAttached();
  });

  test('switches sections via the nav and closes with Escape', async ({ page }) => {
    await page.goto('/organization/org_acme/dashboard#settings/account/profile');
    await expect(page.getByTestId('settings-modal')).toBeVisible();

    await page.getByTestId('settings-nav-organization-general').click();
    await expect(page).toHaveURL(/#settings\/organization\/general$/);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('settings-modal')).not.toBeVisible();
  });
});

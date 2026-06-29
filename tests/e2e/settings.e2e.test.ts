import { expect, test } from '@playwright/test';

import {
  createTeamOrgViaSwitcher,
  registerNewUserAndGoToDashboard,
} from '@/tests/utils/e2e-auth.ts';
import { openSettingsHash } from '@/tests/utils/e2e-hybrid.ts';

test.describe('Settings modal (hash-driven)', () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
  });

  test('opens from the user menu and writes the hash', async ({ page }) => {
    await page.getByTestId('user-menu-trigger').click();
    await expect(page.getByTestId('user-menu-settings')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('settings-modal')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/#settings\/account\/profile$/);
  });

  test('deep link opens the requested section over the page', async ({ page }) => {
    await openSettingsHash(page, 'account', 'security');
    await expect(page.getByTestId('settings-section-security')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId('dashboard-page')).toBeAttached();
  });

  test('account nav sections render profile and security panels', async ({ page }) => {
    await openSettingsHash(page, 'account', 'profile');
    await expect(page.getByTestId('settings-section-profile')).toBeVisible();

    await page.getByTestId('settings-nav-account-security').click();
    await expect(page).toHaveURL(/#settings\/account\/security$/);
    await expect(page.getByTestId('settings-section-security')).toBeVisible({
      timeout: 10000,
    });
  });

  test('organization nav appears after creating a team org', async ({ page }) => {
    const switcher = page.getByTestId('organization-switcher-trigger');
    test.skip(!(await switcher.isVisible().catch(() => false)), 'org switcher hidden');
    await createTeamOrgViaSwitcher(page);

    await openSettingsHash(page, 'account', 'profile');
    await page.getByTestId('settings-nav-organization-general').click();
    await expect(page).toHaveURL(/#settings\/organization\/general$/);
    await expect(page.getByTestId('settings-section-org-general')).toBeVisible({
      timeout: 10000,
    });

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('settings-modal')).not.toBeVisible();
  });
});

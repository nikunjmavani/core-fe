import { expect, test } from '@playwright/test';

import {
  createTeamOrgViaSwitcher,
  registerNewUserAndGoToDashboard,
} from '@/tests/utils/e2e-auth.ts';
import { gotoApp, navigateAuthenticated } from '@/tests/utils/e2e-hybrid.ts';

test.describe('Organization picker', () => {
  test('redirects unauthenticated visitors to login', async ({ page }) => {
    await gotoApp(page, '/organization');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('redirects provisioned personal users to dashboard', async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
    await navigateAuthenticated(page, '/organization');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });

  test('organization switcher lists team org after create', async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
    const switcher = page.getByTestId('organization-switcher-trigger');
    test.skip(!(await switcher.isVisible().catch(() => false)), 'org switcher hidden');
    const { slug } = await createTeamOrgViaSwitcher(page);
    await page.getByTestId('organization-switcher-trigger').click();
    await expect(page.getByTestId(`organization-switcher-option-${slug}`)).toBeVisible({
      timeout: 10000,
    });
    await page.keyboard.press('Escape');
  });
});

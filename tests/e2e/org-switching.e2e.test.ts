import { expect, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';

// Dual-URL switch-on-navigation (FE-19/21/24): the switcher moves between the
// team org's `/organization/$id/dashboard` and the personal org's root
// `/dashboard`, driven by the active org in me/context.
test.describe('Organization switching (dual-URL)', () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
  });

  test('starts on the team org dashboard URL', async ({ page }) => {
    await expect(page).toHaveURL(/\/organization\/acme\/dashboard/);
  });

  test('switching to the personal org lands on the root /dashboard', async ({ page }) => {
    await page.getByTestId('organization-switcher-trigger').click();
    await page.getByTestId('organization-switcher-option-personal').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });
});

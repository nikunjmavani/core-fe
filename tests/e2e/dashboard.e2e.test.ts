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
});

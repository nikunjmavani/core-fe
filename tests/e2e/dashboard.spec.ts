import { expect, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
  });

  test('displays dashboard with greeting', async ({ page }) => {
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    await expect(page.getByTestId('dashboard-greeting')).toBeVisible();
  });

  test('displays stat cards', async ({ page }) => {
    await expect(page.getByTestId('stat-card-users')).toBeVisible();
    await expect(page.getByTestId('stat-card-orgs')).toBeVisible();
    await expect(page.getByTestId('stat-card-revenue')).toBeVisible();
    await expect(page.getByTestId('stat-card-active')).toBeVisible();
  });

  test('header elements are visible', async ({ page }) => {
    await expect(page.getByTestId('header')).toBeVisible();
    await expect(page.getByTestId('search-trigger')).toBeVisible();
    await expect(page.getByTestId('user-menu-trigger')).toBeVisible();
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });
});

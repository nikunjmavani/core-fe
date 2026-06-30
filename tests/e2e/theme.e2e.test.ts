import { expect, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';
import { verifyDatabaseConnection } from '@/tests/utils/e2e-session.ts';

/**
 * Theme mode toggle (light / dark / system) in the app header. Dark mode is the
 * `.dark` class on the document element (managed by useThemeStore), so the
 * assertion reads the real applied state, not just the menu.
 */

test.describe('Theme mode toggle', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !(await verifyDatabaseConnection()),
      'DATABASE_URL must reach core-be Postgres (mail_outbox)',
    );
    await registerNewUserAndGoToDashboard(page);
  });

  test('switches to dark and back to light', async ({ page }) => {
    const html = page.locator('html');

    await page.getByTestId('theme-toggle').click();
    await expect(page.getByTestId('theme-dark')).toBeVisible();
    await page.getByTestId('theme-dark').click();
    await expect(html).toHaveClass(/dark/);

    // Radix closes the menu on select; wait for it to fully dismiss before
    // reopening, otherwise the trigger click lands mid-close and is swallowed.
    await expect(page.getByTestId('theme-dark')).toHaveCount(0);
    await page.getByTestId('theme-toggle').click();
    await expect(page.getByTestId('theme-light')).toBeVisible();
    await page.getByTestId('theme-light').click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test('exposes the system option', async ({ page }) => {
    await page.getByTestId('theme-toggle').click();
    // All three modes are exposed and labelled.
    await expect(page.getByTestId('theme-light')).toBeVisible();
    await expect(page.getByTestId('theme-dark')).toBeVisible();
    await expect(page.getByTestId('theme-system')).toBeVisible();
  });
});

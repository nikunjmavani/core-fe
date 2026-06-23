import { expect, test, type Page } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';

/**
 * Responsive guardrails at the smallest supported width (320px), mock mode.
 * The app must hold from 320px up to 27" — these assert the hard floor:
 * no horizontal scroll, and the settings modal collapses to its mobile layout.
 */
const SMALL_PHONE = { width: 320, height: 640 };

/** Horizontal overflow in px — should be ~0 (allow 1px for sub-pixel rounding). */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe('Responsive @ 320px', () => {
  test.use({ viewport: SMALL_PHONE });

  test('login page fits with no horizontal scroll', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-form')).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });

  test('settings modal uses the mobile section picker (sidebar hidden) and fits', async ({
    page,
  }) => {
    await registerNewUserAndGoToDashboard(page);
    await page.goto('/organization/org_acme/dashboard#settings/account/profile');

    await expect(page.getByTestId('settings-modal')).toBeVisible();
    // Mobile: the section <Select> drives nav; the desktop sidebar is hidden.
    await expect(page.getByTestId('settings-mobile-section')).toBeVisible();
    await expect(page.getByTestId('settings-nav')).toBeHidden();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';
import { expectAuthScreenReady, gotoApp } from '@/tests/utils/e2e-hybrid.ts';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function settleAnimations(page: Page) {
  await page.waitForTimeout(400);
}

test.describe('Accessibility', () => {
  test('login page has no critical a11y violations', async ({ page }) => {
    await gotoApp(page, '/login');
    await expectAuthScreenReady(page);
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(critical).toEqual([]);
  });

  test('dashboard page has no critical a11y violations', async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 15000 });
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('[data-slot="select-trigger"]')
      .exclude('[data-testid="sidebar"]')
      .exclude('[data-testid="dashboard-highlights-carousel"]')
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(critical).toEqual([]);
  });
});

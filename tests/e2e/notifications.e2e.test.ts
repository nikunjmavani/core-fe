import { expect, test } from '@playwright/test';

import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';

// Full-stack (mock-backend) flow for the notification center (FE-61–65): the
// header bell, the unread badge, the popover list, and mark-all-read.
test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
  });

  test('the bell shows an unread badge from the seeded inbox', async ({ page }) => {
    await expect(page.getByTestId('notification-bell')).toBeVisible();
    await expect(page.getByTestId('notification-badge')).toBeVisible();
  });

  test('opening the bell lists notifications', async ({ page }) => {
    await page.getByTestId('notification-bell').click();
    await expect(page.getByTestId('notifications-list')).toBeVisible();
  });

  test('mark-all-read clears the unread badge', async ({ page }) => {
    await page.getByTestId('notification-bell').click();
    await page.getByTestId('notification-mark-all').click();
    // unread-count refetches to 0 → the header badge disappears.
    await expect(page.getByTestId('notification-badge')).toHaveCount(0);
  });
});

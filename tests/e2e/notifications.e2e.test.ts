import { test } from '@playwright/test';

/**
 * Notification center E2E requires seeded inbox data from core-be
 * (`GET /me/notifications`). Re-enable when the backend exposes test fixtures.
 */
test.describe.skip('Notifications', () => {
  test('shows seeded notifications', () => {
    /* Pending core-be test fixtures (GET /me/notifications). */
  });
});

import { expect, test } from '@playwright/test';

/**
 * Network-fault resilience — the implementable slice of core-be's chaos
 * testing for a mock-mode frontend: connectivity loss surfaces the global
 * OfflineIndicator (and recovers), and a failing /version.json poll endpoint
 * never takes the app down.
 */
test.describe('Network resilience', () => {
  test('offline banner appears on connectivity loss and clears on recovery', async ({
    page,
    context,
  }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('offline-indicator')).toHaveCount(0);

    await context.setOffline(true);
    await expect(page.getByTestId('offline-indicator')).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByTestId('offline-indicator')).toHaveCount(0);
  });

  test('app boots and stays interactive when /version.json is unreachable', async ({
    page,
  }) => {
    // Kill the new-deployment poll target before the app ever loads.
    await page.route('**/version.json', (route) => route.abort());

    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();

    // Still interactive: form accepts input despite the failing poll.
    await page.getByLabel('Email').fill('user@example.com');
    await expect(page.getByLabel('Email')).toHaveValue('user@example.com');

    expect(
      pageErrors,
      `uncaught page errors: ${pageErrors.map((e) => e.message).join(', ')}`,
    ).toHaveLength(0);
  });
});

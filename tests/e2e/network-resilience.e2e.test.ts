import { expect, test } from '@playwright/test';

import { uniqueE2eEmail } from '@/tests/utils/e2e-faker.ts';
import { expectLoginFormReady, fillTestId } from '@/tests/utils/e2e-hybrid.ts';

/**
 * Network-fault resilience — connectivity loss surfaces the global
 * OfflineIndicator (and recovers), and a failing /version.json poll endpoint
 * never takes the app down. No API server required.
 */
test.describe('Network resilience', () => {
  test('offline banner appears on connectivity loss and clears on recovery', async ({
    page,
    context,
  }) => {
    await page.goto('/login');
    await expectLoginFormReady(page);
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
    await expectLoginFormReady(page);

    // Hybrid: fill via testid; assert value via label (a11y path still works).
    const email = uniqueE2eEmail('network');
    await fillTestId(page, 'auth-email', email);
    await expect(page.getByLabel(/^email$/i)).toHaveValue(email);

    expect(
      pageErrors,
      `uncaught page errors: ${pageErrors.map((e) => e.message).join(', ')}`,
    ).toHaveLength(0);
  });
});

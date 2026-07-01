import { expect, test } from '@playwright/test';

import { clickTestId, gotoApp } from '@/tests/utils/e2e-hybrid.ts';

test.describe('Accept invite', () => {
  test('invalid token shows error and sign-in link (hybrid)', async ({ page }) => {
    await gotoApp(page, '/accept-invite/inv_expired');

    await expect(page.getByTestId('accept-invite-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('accept-invite-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('accept-invite-login')).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();

    await clickTestId(page, 'accept-invite-login');
    await expect(page).toHaveURL(/\/login/);
  });

  test('malformed invitation id in URL shows 404', async ({ page }) => {
    await gotoApp(page, '/accept-invite/not-a-valid-invitation-id');
    await expect(page.getByTestId('not-found-page')).toBeVisible({ timeout: 10000 });
  });

  test('accept-invite without an invitation id falls through to 404', async ({
    page,
  }) => {
    // The route is /accept-invite/$invitationId — a bare /accept-invite has no
    // match and lands on the splat 404.
    await gotoApp(page, '/accept-invite');
    await expect(page.getByTestId('not-found-page')).toBeVisible({ timeout: 10000 });
  });

  test('the invalid-invite error state links back to /login', async ({ page }) => {
    await gotoApp(page, '/accept-invite/inv_expired');
    await expect(page.getByTestId('accept-invite-error')).toBeVisible({ timeout: 15000 });

    // The sign-in affordance is a real anchor to /login (hybrid: testid + role).
    const signIn = page.getByTestId('accept-invite-login');
    await expect(signIn).toHaveAttribute('href', /\/login$/);
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});

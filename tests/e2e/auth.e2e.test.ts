import { expect, test } from '@playwright/test';

import { API_ENDPOINTS } from '@/core/config/constants.ts';
import { registerNewUserAndGoToDashboard } from '@/tests/utils/e2e-auth.ts';
import { uniqueE2eEmail } from '@/tests/utils/e2e-faker.ts';
import {
  clickTestId,
  expectAuthScreenReady,
  fillEmailVerificationCode,
  fillTestId,
  gotoApp,
  submitAuthEmailForCode,
} from '@/tests/utils/e2e-hybrid.ts';
import { verifyDatabaseConnection } from '@/tests/utils/e2e-session.ts';

test.describe('Authentication', () => {
  test('shows unified auth screen with email open by default', async ({ page }) => {
    await gotoApp(page, '/login');
    await expectAuthScreenReady(page);
    await expect(page.getByTestId('auth-email-panel')).toBeVisible();
    await expect(page.getByTestId('auth-continue-google')).toBeVisible();
    await expect(page.getByTestId('auth-continue-github')).toBeVisible();
  });

  test('invalid verification code calls the API and surfaces an error', async ({
    page,
  }) => {
    let verifyStatus = 0;
    page.on('response', (res) => {
      if (res.url().includes(API_ENDPOINTS.AUTH.EMAIL_CODE_LOGIN))
        verifyStatus = res.status();
    });

    await gotoApp(page, '/login');
    await submitAuthEmailForCode(page, uniqueE2eEmail('wrong'));
    await fillEmailVerificationCode(page, '000000');
    await expect.poll(() => verifyStatus, { timeout: 15000 }).toBe(401);
    await expect(page.getByTestId('auth-email-verify-panel')).toBeVisible();
  });

  test('email-code sign-in through core-be reaches dashboard', async ({ page }) => {
    test.skip(
      !(await verifyDatabaseConnection()),
      'DATABASE_URL must reach core-be Postgres (auth.mail_outbox)',
    );
    await registerNewUserAndGoToDashboard(page);
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });

  test('MFA route shows session-expired shell without token', async ({ page }) => {
    await page.goto('/mfa');
    await expect(page.getByTestId('mfa-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /session expired/i })).toBeVisible();
  });

  test('OAuth callback without session redirects to login', async ({ page }) => {
    await page.goto('/callback');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expectAuthScreenReady(page);
  });

  test('unauthorized page is public', async ({ page }) => {
    await page.goto('/unauthorized');
    await expect(page.getByTestId('unauthorized-page')).toBeVisible();
  });

  test('shows Continue with GitHub on the unified auth screen', async ({ page }) => {
    await gotoApp(page, '/login');
    await expectAuthScreenReady(page);
    await expect(page.getByTestId('auth-continue-github')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /continue with github/i }),
    ).toBeVisible();
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('core-auth-skip-auto-google', '1');
    });
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expectAuthScreenReady(page);
  });

  test('rejects empty email submit', async ({ page }) => {
    await gotoApp(page, '/login');
    await fillTestId(page, 'auth-email', '');
    await clickTestId(page, 'auth-email-submit');
    await expect(page.getByTestId('auth-email-error')).toBeVisible();
  });

  test('email verification step shows resend and change email actions', async ({
    page,
  }) => {
    const email = uniqueE2eEmail('verify-flow');
    await gotoApp(page, '/login');
    await submitAuthEmailForCode(page, email);
    await expect(page.getByText(/we sent a verification code to/i)).toBeVisible();
    await expect(page.getByText(/didn't receive a code/i)).toBeVisible();
    await expect(page.getByTestId('auth-email-resend-countdown')).toBeVisible();
    await expect(page.getByTestId('auth-email-change')).toBeVisible();
  });
});

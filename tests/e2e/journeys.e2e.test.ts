import { expect, test } from '@playwright/test';

import {
  completeOnboardingWizard,
  createTeamOrgViaSwitcher,
  loginViaEmailCodeUI,
  navigateInApp,
  registerNewUserAndGoToDashboard,
} from '@/tests/utils/e2e-auth.ts';
import {
  clickTestId,
  expectAppHeaderReady,
  expectLoginFormReady,
  gotoApp,
  navigateAuthenticated,
  openSettingsHash,
} from '@/tests/utils/e2e-hybrid.ts';
import {
  createSessionViaEmailCode,
  pollInvitationTokenFromMailOutbox,
  requireDatabaseUrl,
  uniqueE2eEmail,
  verifyDatabaseConnection,
} from '@/tests/utils/e2e-session.ts';
import { createTeamInvitation } from '@/tests/utils/e2e-tenancy.ts';

test.describe('Product journeys', () => {
  test.beforeEach(async () => {
    test.skip(
      !(await verifyDatabaseConnection()),
      'DATABASE_URL must reach core-be Postgres (auth.mail_outbox)',
    );
  });

  test('onboarding wizard completes and lands on dashboard', async ({ page }) => {
    requireDatabaseUrl();
    await loginViaEmailCodeUI(page, uniqueE2eEmail('onboard-ui'));
    if (page.url().includes('/onboarding')) {
      await completeOnboardingWizard(page);
    }
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 15000 });
  });

  test('accept invite happy path joins team org', async ({ page, playwright }) => {
    const inviteeEmail = uniqueE2eEmail('invitee');
    const ownerApi = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const inviteeApi = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
    });
    try {
      const ownerToken = (await createSessionViaEmailCode(ownerApi)).accessToken;
      let invitationId: string;
      let orgSlug: string;
      try {
        ({ invitationId, orgSlug } = await createTeamInvitation(
          ownerApi,
          ownerToken,
          inviteeEmail,
        ));
      } catch (error) {
        if (error instanceof Error && error.message === 'SEAT_LIMIT_REACHED') {
          test.skip(true, 'team org seat limit reached in local billing seed');
          return;
        }
        throw error;
      }
      const invitationToken = await pollInvitationTokenFromMailOutbox(inviteeEmail);

      const inviteeSession = await createSessionViaEmailCode(inviteeApi, inviteeEmail);

      await gotoApp(page, '/login');
      await page.waitForFunction(
        () => globalThis.__coreFeEstablishSession != null,
        null,
        {
          timeout: 10_000,
        },
      );
      await page.evaluate(async (token) => {
        const establish = globalThis.__coreFeEstablishSession;
        if (!establish) throw new Error('__coreFeEstablishSession missing');
        await establish(token);
      }, inviteeSession.accessToken);

      await navigateInApp(
        page,
        `/accept-invite/${invitationId}?token=${encodeURIComponent(invitationToken)}`,
      );
      await expect(page.getByTestId('accept-invite-success')).toBeVisible({
        timeout: 15000,
      });
      await expect(page).toHaveURL(new RegExp(`/organization/${orgSlug}/dashboard`), {
        timeout: 20000,
      });
      await expect(page.getByTestId('dashboard-page')).toBeVisible();
    } finally {
      await ownerApi.dispose();
      await inviteeApi.dispose();
    }
  });

  test('accept invite without auth shows error affordance', async ({ page }) => {
    await gotoApp(page, '/accept-invite/inv_expired');
    await expect(page.getByTestId('accept-invite-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('accept-invite-login')).toBeVisible();
  });

  test('suspended page renders for authenticated team member', async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
    const switcher = page.getByTestId('organization-switcher-trigger');
    test.skip(!(await switcher.isVisible().catch(() => false)), 'org switcher hidden');
    const { slug } = await createTeamOrgViaSwitcher(page);
    await navigateAuthenticated(page, `/organization/${slug}/suspended`);
    await expect(page.getByTestId('suspended-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('suspended-switch-organization')).toBeVisible();
  });

  test('logout clears session and blocks protected routes', async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);
    await expectAppHeaderReady(page);
    await page.getByTestId('user-menu-trigger').click();
    await clickTestId(page, 'logout-button');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expectLoginFormReady(page);
    await navigateInApp(page, '/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('settings account and organization section smoke matrix', async ({ page }) => {
    await registerNewUserAndGoToDashboard(page);

    const accountSections: Array<{ section: string; panel: string }> = [
      { section: 'profile', panel: 'settings-section-profile' },
      { section: 'security', panel: 'settings-section-security' },
      { section: 'notifications', panel: 'settings-section-notifications' },
    ];

    for (const { section, panel } of accountSections) {
      await openSettingsHash(page, 'account', section);
      await expect(page.getByTestId(panel)).toBeVisible({ timeout: 10000 });
    }

    const switcher = page.getByTestId('organization-switcher-trigger');
    test.skip(!(await switcher.isVisible().catch(() => false)), 'org switcher hidden');
    await createTeamOrgViaSwitcher(page);

    await openSettingsHash(page, 'organization', 'general');
    await expect(page.getByTestId('settings-section-org-general')).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId('settings-nav-organization-members').click();
    await expect(page).toHaveURL(/#settings\/organization\/members$/);
    await expect(page.getByTestId('settings-organization-members')).toBeVisible({
      timeout: 10000,
    });
  });
});

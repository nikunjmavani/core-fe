import { expect, type Page, type PlaywrightWorkerArgs, test } from '@playwright/test';

import { navigateInApp } from '@/tests/utils/e2e-auth.ts';
import { gotoApp, openSettingsHash } from '@/tests/utils/e2e-hybrid.ts';
import {
  createSessionViaEmailCode,
  verifyDatabaseConnection,
} from '@/tests/utils/e2e-session.ts';
import { createTeamOrganization } from '@/tests/utils/e2e-tenancy.ts';

/**
 * Organization settings UI — the team-org admin surfaces (general, members,
 * roles, integrations/webhooks+API keys). The HTTP contracts live in
 * `tenancy-api.e2e.test.ts`; this drives the panels a team owner actually sees.
 */

/**
 * Provision a team org via the API and hydrate the team-scoped browser session,
 * landing on its dashboard. Returns `null` when the env can't provision one.
 */
async function landOnTeamDashboard(
  page: Page,
  playwright: PlaywrightWorkerArgs['playwright'],
): Promise<{ slug: string } | null> {
  const api = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  try {
    const { accessToken } = await createSessionViaEmailCode(api);
    const { org, teamToken } = await createTeamOrganization(api, accessToken);
    if (!org) return null;

    await gotoApp(page, '/login');
    await page.waitForFunction(() => globalThis.__coreFeEstablishSession != null, null, {
      timeout: 10_000,
    });
    await page.evaluate(async (token) => {
      const establish = globalThis.__coreFeEstablishSession;
      if (!establish) throw new Error('__coreFeEstablishSession missing');
      await establish(token);
    }, teamToken);

    if (!org.slug) throw new Error('team org slug missing');
    await navigateInApp(page, `/organization/${org.slug}/dashboard`);
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 15000 });
    return { slug: org.slug };
  } finally {
    await api.dispose();
  }
}

test.describe('Organization settings', () => {
  test.beforeEach(async () => {
    test.skip(
      !(await verifyDatabaseConnection()),
      'DATABASE_URL must reach core-be Postgres (mail_outbox)',
    );
  });

  test('general section renders the org profile panel', async ({ page, playwright }) => {
    const ctx = await landOnTeamDashboard(page, playwright);
    test.skip(ctx === null, 'team org could not be provisioned in this environment');

    await openSettingsHash(page, 'organization', 'general');
    await expect(page.getByTestId('settings-section-org-general')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('members section lists the creating owner', async ({ page, playwright }) => {
    const ctx = await landOnTeamDashboard(page, playwright);
    test.skip(ctx === null, 'team org could not be provisioned in this environment');

    await openSettingsHash(page, 'organization', 'members');
    await expect(page.getByTestId('settings-organization-members')).toBeVisible({
      timeout: 15000,
    });
    // a11y guard: the section heading is exposed.
    await expect(
      page.getByTestId('settings-organization-members').getByRole('heading', {
        name: 'Members',
      }),
    ).toBeVisible();
    // The creating owner is the sole member row.
    await expect(page.getByTestId('members-list')).toBeVisible();
    await expect(page.getByTestId('members-list').getByRole('listitem')).toHaveCount(1);
  });

  test('roles section lists the seeded organization roles', async ({
    page,
    playwright,
  }) => {
    const ctx = await landOnTeamDashboard(page, playwright);
    test.skip(ctx === null, 'team org could not be provisioned in this environment');

    await openSettingsHash(page, 'organization', 'roles');
    await expect(page.getByTestId('settings-organization-roles')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('roles-list')).toBeVisible();
  });
});

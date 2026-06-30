import { expect, type Page, type PlaywrightWorkerArgs, test } from '@playwright/test';

import {
  navigateInApp,
  registerNewUserAndGoToDashboard,
} from '@/tests/utils/e2e-auth.ts';
import { gotoApp, openSettingsHash } from '@/tests/utils/e2e-hybrid.ts';
import {
  createSessionViaEmailCode,
  verifyDatabaseConnection,
} from '@/tests/utils/e2e-session.ts';
import { bearerHeaders, createTeamOrganization } from '@/tests/utils/e2e-tenancy.ts';

/**
 * Billing & subscription UI flow (`#settings/account/billing`).
 *
 * The HTTP contract is covered by `billing-api.e2e.test.ts`; this spec drives the
 * actual panel: plan catalog, billing-cycle toggle, subscription summary,
 * invoices, payment methods, cancellation, and the personal-org gate. Billing is
 * a team-org feature (`subscription:manage`, `teamOrganizationOnly`), so the
 * setup creates a team org via the API and hydrates the team-scoped session.
 */

const API = 'http://localhost:3000/api/v1';

type TeamContext = { slug: string; subscribed: boolean };

/**
 * Create a team org via the API, optionally seed a free-plan subscription, then
 * hydrate the browser with the team-scoped token and land on its dashboard.
 * Returns `null` when the environment can't provision one (seat seed / Stripe).
 */
async function setUpTeamBilling(
  page: Page,
  playwright: PlaywrightWorkerArgs['playwright'],
  opts: { withSubscription: boolean },
): Promise<TeamContext | null> {
  const api = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  try {
    const { accessToken } = await createSessionViaEmailCode(api);
    const { org, teamToken } = await createTeamOrganization(api, accessToken);
    if (!org) return null;

    let subscribed = false;
    if (opts.withSubscription) {
      const plansRes = await api.get(`${API}/billing/plans`);
      const plans = plansRes.ok()
        ? (
            (await plansRes.json()) as {
              data: Array<{ id: string; price_monthly: string }>;
            }
          ).data
        : [];
      // A free plan activates without a payment method — the reliable seed path.
      const freePlan = plans.find((p) => Number(p.price_monthly) === 0) ?? plans[0];
      if (freePlan) {
        const sub = await api.post(`${API}/billing/subscriptions`, {
          headers: bearerHeaders(teamToken, true),
          data: { plan_id: freePlan.id, billing_cycle: 'monthly' },
        });
        subscribed = sub.ok();
      }
    }

    await gotoApp(page, '/login');
    await page.waitForFunction(() => globalThis.__coreFeEstablishSession != null, null, {
      timeout: 10_000,
    });
    await page.evaluate(async (token) => {
      const establish = globalThis.__coreFeEstablishSession;
      if (!establish) throw new Error('__coreFeEstablishSession missing');
      await establish(token);
    }, teamToken);

    await navigateInApp(page, `/organization/${org.slug}/dashboard`);
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 15000 });
    return { slug: org.slug, subscribed };
  } finally {
    await api.dispose();
  }
}

test.describe('Billing & subscription', () => {
  test.beforeEach(async () => {
    test.skip(
      !(await verifyDatabaseConnection()),
      'DATABASE_URL must reach core-be Postgres (mail_outbox + billing seed)',
    );
  });

  test('a team manager sees the plan catalog and the billing-cycle toggle', async ({
    page,
    playwright,
  }) => {
    const ctx = await setUpTeamBilling(page, playwright, { withSubscription: false });
    test.skip(ctx === null, 'team org could not be provisioned in this environment');

    await openSettingsHash(page, 'account', 'billing');

    await expect(page.getByTestId('settings-account-billing')).toBeVisible({
      timeout: 15000,
    });
    // a11y guard: the panel is a labelled region inside the settings dialog,
    // with the "Billing" section heading exposed to assistive tech.
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByTestId('settings-account-billing').getByText('Billing', { exact: true }),
    ).toBeVisible();

    await expect(page.getByTestId('billing-summary')).toBeVisible();
    await expect(page.getByTestId('plan-options')).toBeVisible();
    // Manager-only controls are exposed.
    await expect(page.getByTestId('billing-cycle-toggle')).toBeVisible();
  });

  test('the billing-cycle toggle switches plan pricing between monthly and yearly', async ({
    page,
    playwright,
  }) => {
    const ctx = await setUpTeamBilling(page, playwright, { withSubscription: false });
    test.skip(ctx === null, 'team org could not be provisioned in this environment');

    await openSettingsHash(page, 'account', 'billing');
    await expect(page.getByTestId('billing-cycle-toggle')).toBeVisible({
      timeout: 15000,
    });

    // Defaults to monthly pricing on the plan cards.
    await expect(page.getByText(/\/\s*mo/).first()).toBeVisible();

    await page.getByTestId('billing-cycle-yearly').click();
    await expect(page.getByText(/\/\s*yr/).first()).toBeVisible();

    await page.getByTestId('billing-cycle-monthly').click();
    await expect(page.getByText(/\/\s*mo/).first()).toBeVisible();
  });

  test('an active subscription surfaces summary, invoices, payment methods, and cancellation', async ({
    page,
    playwright,
  }) => {
    const ctx = await setUpTeamBilling(page, playwright, { withSubscription: true });
    test.skip(ctx === null, 'team org could not be provisioned in this environment');
    test.skip(
      !ctx?.subscribed,
      'no free plan seeded / subscription create unavailable in this environment',
    );

    await openSettingsHash(page, 'account', 'billing');

    await expect(page.getByTestId('billing-summary')).toBeVisible({ timeout: 15000 });
    // A subscribed org carries the status badge + the dedicated sections.
    await expect(page.getByTestId('billing-invoices-card')).toBeVisible();
    await expect(page.getByTestId('billing-payment-methods-card')).toBeVisible();
    await expect(page.getByTestId('billing-cancellation-card')).toBeVisible();
  });

  test('a personal account cannot manage billing (team-gated)', async ({ page }) => {
    // Default registration lands in personal mode (no team org).
    await registerNewUserAndGoToDashboard(page);

    await openSettingsHash(page, 'account', 'billing');
    await expect(page.getByTestId('settings-account-billing')).toBeVisible({
      timeout: 15000,
    });

    // Plan-management controls are team-only — never exposed to a personal account.
    await expect(page.getByTestId('billing-cycle-toggle')).toHaveCount(0);
    await expect(page.getByTestId('billing-cancellation-card')).toHaveCount(0);
  });
});

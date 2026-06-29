import { type APIRequestContext, expect, test } from '@playwright/test';

import {
  fetchMeContextWire,
  type ProbedDeployment,
  probeLiveDeployment,
  skipUnlessDeploymentMode,
} from '@/tests/utils/e2e-deployment-mode.ts';
import {
  createSessionViaEmailCode,
  verifyDatabaseConnection,
} from '@/tests/utils/e2e-session.ts';
import { bearerHeaders, createTeamOrganization } from '@/tests/utils/e2e-tenancy.ts';

/**
 * Dual deployment contract (default product shape):
 * `PERSONAL_ORGANIZATION_ENABLED=true`, `TEAM_ORGANIZATION_ENABLED=true`.
 *
 * Skips automatically when the live server is not in this mode.
 */
const API = '/api/v1';
const REQUIRED_MODE = 'personal-and-team' as const;

let api: APIRequestContext;
let liveDeployment: ProbedDeployment | null = null;

test.beforeAll(async ({ playwright }) => {
  test.skip(!(await verifyDatabaseConnection()), 'Postgres mail_outbox required');
  api = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  const { accessToken } = await createSessionViaEmailCode(api);
  liveDeployment = await probeLiveDeployment(api, accessToken);
});

test.afterAll(async () => {
  await api?.dispose();
});

test.beforeEach(() => {
  skipUnlessDeploymentMode(liveDeployment, REQUIRED_MODE);
});

test.describe('deployment — personal-and-team', () => {
  test('me/context advertises both personal and team orgs enabled', async () => {
    const { accessToken } = await createSessionViaEmailCode(api);
    const probed = await probeLiveDeployment(api, accessToken);
    expect(probed.flags).toEqual({
      personalOrganizations: true,
      teamOrganizations: true,
    });
    expect(probed.mode).toBe(REQUIRED_MODE);
  });

  test('new user starts on a PERSONAL workspace with a personal_organization_id', async () => {
    const { accessToken } = await createSessionViaEmailCode(api);
    const ctx = await fetchMeContextWire(api, accessToken);
    expect(ctx.active_organization?.type).toBe('PERSONAL');
    expect(ctx.user.personal_organization_id).toBeTruthy();
  });

  test('user can create a TEAM organization alongside the personal workspace', async () => {
    const { accessToken } = await createSessionViaEmailCode(api);
    const before = await fetchMeContextWire(api, accessToken);
    expect(before.organizations.some((o) => o.type === 'PERSONAL')).toBe(true);

    const { createStatus, org, teamToken } = await createTeamOrganization(
      api,
      accessToken,
    );
    expect(createStatus).toBe(201);
    expect(org?.id).toMatch(/^org_/);

    const after = await fetchMeContextWire(api, teamToken);
    expect(after.organizations.some((o) => o.type === 'PERSONAL')).toBe(true);
    expect(after.organizations.some((o) => o.type === 'TEAM')).toBe(true);
  });

  test('billing is gated on personal token but allowed on team token', async () => {
    const { accessToken } = await createSessionViaEmailCode(api);
    const personalBilling = await api.get(`${API}/billing/subscriptions`, {
      headers: bearerHeaders(accessToken),
    });
    expect(personalBilling.status()).toBe(403);

    const { org, teamToken } = await createTeamOrganization(api, accessToken);
    expect(org).not.toBeNull();

    const teamBilling = await api.get(`${API}/billing/subscriptions`, {
      headers: bearerHeaders(teamToken),
    });
    expect(teamBilling.status()).toBe(200);
  });
});

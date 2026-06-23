import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * Tenancy contract e2e against the running core-be (:3000): org
 * lifecycle, roles, memberships, the personal-vs-team guards, and the
 * permission catalog. Self-contained (own helpers); auto-skips when the
 * server is unreachable.
 */
const API = '/api/v1';
const PASSWORD = 'Zx9q!m2716Kv_tg';

let api: APIRequestContext;
let serverUp = false;

const uniqueEmail = () =>
  `fe-e2e-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@acme.test`;
const idem = () => crypto.randomUUID();
const bearer = (token: string, withIdem = false) => ({
  Authorization: `Bearer ${token}`,
  ...(withIdem ? { 'X-Idempotency-Key': idem() } : {}),
});

async function signup(): Promise<string> {
  const res = await api.post(`${API}/auth/signup`, {
    data: {
      email: uniqueEmail(),
      password: PASSWORD,
      first_name: 'E2E',
      last_name: 'User',
    },
  });
  return ((await res.json()) as { data: { access_token: string } }).data.access_token;
}

/** Create a TEAM org and switch the token into it; returns the team-scoped token + org. */
async function createTeamAndSwitch(token: string) {
  const slug = `team-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  const create = await api.post(`${API}/tenancy/organizations`, {
    headers: bearer(token, true),
    data: { name: `Team ${slug}`, slug },
  });
  const org = create.ok()
    ? ((await create.json()) as { data: { id: string; slug: string | null } }).data
    : null;
  let teamToken = token;
  if (org) {
    const sw = await api.post(`${API}/auth/switch-to-organization`, {
      headers: bearer(token),
      data: { organization_id: org.id },
    });
    if (sw.ok())
      teamToken = ((await sw.json()) as { data: { access_token: string } }).data
        .access_token;
  }
  return { createStatus: create.status(), org, teamToken };
}

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  try {
    serverUp = (await api.get('/readyz', { timeout: 3000 })).ok();
  } catch {
    serverUp = false;
  }
});
test.afterAll(async () => {
  await api?.dispose();
});

test.describe('core-be — organization lifecycle', () => {
  test.beforeEach(() => test.skip(!serverUp, 'core-be not reachable on :3000'));

  test('[+] create a TEAM organization (with X-Idempotency-Key)', async () => {
    const token = await signup();
    const slug = `acme-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const res = await api.post(`${API}/tenancy/organizations`, {
      headers: bearer(token, true),
      data: { name: 'Acme QA', slug },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data.type).toBe('TEAM');
    expect(data.slug).toBe(slug);
  });

  test('[-] create organization WITHOUT X-Idempotency-Key → 422', async () => {
    const token = await signup();
    const res = await api.post(`${API}/tenancy/organizations`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'No Idem', slug: `noidem-${Date.now()}` },
    });
    expect(res.status()).toBe(422);
  });

  test('[-] create organization with a duplicate slug → 409', async () => {
    const token = await signup();
    const slug = `dup-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const first = await api.post(`${API}/tenancy/organizations`, {
      headers: bearer(token, true),
      data: { name: 'Dup One', slug },
    });
    expect(first.status()).toBe(201);
    const second = await api.post(`${API}/tenancy/organizations`, {
      headers: bearer(token, true),
      data: { name: 'Dup Two', slug },
    });
    expect(second.status()).toBe(409);
  });

  test('[-] create organization with an invalid slug → 4xx', async () => {
    const token = await signup();
    const res = await api.post(`${API}/tenancy/organizations`, {
      headers: bearer(token, true),
      data: { name: 'Bad Slug', slug: 'Not A Valid Slug!' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('[+] current organization + by-slug lookup resolve for a team', async () => {
    const token = await signup();
    const { org, teamToken } = await createTeamAndSwitch(token);
    test.skip(!org, 'team creation unavailable on this deployment');

    const current = await api.get(`${API}/tenancy/organization`, {
      headers: bearer(teamToken),
    });
    expect(current.status()).toBe(200);
    expect((await current.json()).data.id).toBe(org?.id);

    if (org?.slug) {
      const bySlug = await api.get(`${API}/tenancy/organizations/by-slug/${org.slug}`, {
        headers: bearer(teamToken),
      });
      expect(bySlug.status()).toBe(200);
    }
  });

  test('[-] by-slug lookup for a nonexistent slug → 404', async () => {
    const token = await signup();
    const res = await api.get(`${API}/tenancy/organizations/by-slug/nope-${Date.now()}`, {
      headers: bearer(token),
    });
    expect(res.status()).toBe(404);
  });
});

test.describe('core-be — roles, members & permission catalog', () => {
  test.beforeEach(() => test.skip(!serverUp, 'core-be not reachable on :3000'));

  test('[+] permission catalog lists the org permission codes', async () => {
    const token = await signup();
    const res = await api.get(`${API}/tenancy/permissions`, { headers: bearer(token) });
    expect(res.status()).toBe(200);
    const codes = ((await res.json()) as { data: Array<{ code: string }> }).data.map(
      (p) => p.code,
    );
    expect(codes).toContain('organization:read');
    expect(codes).toContain('membership:manage');
  });

  test('[+] a team lists roles, memberships and api-keys', async () => {
    const token = await signup();
    const { org, teamToken } = await createTeamAndSwitch(token);
    test.skip(!org, 'team creation unavailable on this deployment');

    const roles = await api.get(`${API}/tenancy/organization/roles`, {
      headers: bearer(teamToken),
    });
    expect(roles.status()).toBe(200);
    expect((await roles.json()).data.length).toBeGreaterThanOrEqual(1); // system Owner role

    const members = await api.get(`${API}/tenancy/organization/memberships`, {
      headers: bearer(teamToken),
    });
    expect(members.status()).toBe(200);
    expect((await members.json()).data.length).toBeGreaterThanOrEqual(1); // the owner

    const keys = await api.get(`${API}/tenancy/organization/api-keys`, {
      headers: bearer(teamToken),
    });
    expect(keys.status()).toBe(200);
  });

  test('[+] create a custom role in a team', async () => {
    const token = await signup();
    const { org, teamToken } = await createTeamAndSwitch(token);
    test.skip(!org, 'team creation unavailable on this deployment');

    const res = await api.post(`${API}/tenancy/organization/roles`, {
      headers: bearer(teamToken, true),
      data: { name: `QA Role ${Date.now()}`, description: 'created by e2e' },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).data.is_system).toBe(false);
  });

  test('[-] create a role with an empty name → 4xx', async () => {
    const token = await signup();
    const { org, teamToken } = await createTeamAndSwitch(token);
    test.skip(!org, 'team creation unavailable on this deployment');

    const res = await api.post(`${API}/tenancy/organization/roles`, {
      headers: bearer(teamToken, true),
      data: { name: '' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('core-be — personal-org guards (422)', () => {
  test.beforeEach(() => test.skip(!serverUp, 'core-be not reachable on :3000'));

  test('[-] cannot add a member to a personal org → 422', async () => {
    const token = await signup(); // token is scoped to the personal org
    const res = await api.post(`${API}/tenancy/organization/memberships`, {
      headers: bearer(token, true),
      data: { email: uniqueEmail(), role_id: 'rol_zzzzzzzzzzzzzzzzzzzzz' },
    });
    expect(res.status()).toBe(422);
  });

  test('[-] cannot create a role in a personal org → 422', async () => {
    const token = await signup();
    const res = await api.post(`${API}/tenancy/organization/roles`, {
      headers: bearer(token, true),
      data: { name: 'Should Fail' },
    });
    expect(res.status()).toBe(422);
  });
});

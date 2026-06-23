import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * Contract e2e: exercises the running core-be at http://localhost:3000 (not the
 * mock layer). Covers positive (green) and negative (red→expected) flows the
 * frontend depends on. Auto-skips when the server is unreachable so the mock
 * e2e suite (against the FE dev server) is unaffected.
 *
 * Run: pnpm exec playwright test tests/e2e/integration-auth.spec.ts
 */
const HOST = 'http://localhost:3000';
const PASSWORD = 'Passw0rd!2026secure';

let api: APIRequestContext;
let serverUp = false;

const uniqueEmail = () =>
  `fe-e2e-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@acme.test`;

async function signup(email = uniqueEmail()) {
  const res = await api.post('/api/v1/auth/signup', {
    data: { email, password: PASSWORD, first_name: 'E2E', last_name: 'User' },
  });
  return { res, email };
}

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL: HOST });
  try {
    const res = await api.get('/readyz', { timeout: 3000 });
    serverUp = res.ok();
  } catch {
    serverUp = false;
  }
});

test.afterAll(async () => {
  await api?.dispose();
});

test.describe('core-be server — auth & tenancy contracts', () => {
  test.beforeEach(() => {
    test.skip(!serverUp, 'core-be is not reachable on http://localhost:3000');
  });

  // ── POSITIVE (green) ───────────────────────────────────────────────────────
  test('[+] signup returns access_token + session_id + request_id', async () => {
    const { res } = await signup();
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.access_token).toBeTruthy();
    expect(body.data.session_id).toMatch(/^ses_[a-z0-9]{21}$/);
    expect(body.meta.request_id).toBeTruthy();
  });

  test('[+] login with correct credentials returns a token', async () => {
    const email = uniqueEmail();
    await signup(email);
    const res = await api.post('/api/v1/auth/login', {
      data: { email, password: PASSWORD },
    });
    expect([200, 201]).toContain(res.status());
    expect((await res.json()).data.access_token).toBeTruthy();
  });

  test('[+] me/context exposes the auto-created PERSONAL org (status ACTIVE)', async () => {
    const { res } = await signup();
    const token = (await res.json()).data.access_token;
    const ctx = await api.get('/api/v1/auth/me/context', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(ctx.status()).toBe(200);
    const { data } = await ctx.json();
    expect(data.active_organization.type).toBe('PERSONAL');
    expect(data.active_organization.status).toBe('ACTIVE');
    expect(Array.isArray(data.my_permissions)).toBe(true);
    expect(data.organizations.length).toBeGreaterThanOrEqual(1);
  });

  test('[+] list my organizations includes the personal org', async () => {
    const { res } = await signup();
    const token = (await res.json()).data.access_token;
    const list = await api.get('/api/v1/tenancy/organizations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.status()).toBe(200);
    expect((await list.json()).data.length).toBeGreaterThanOrEqual(1);
  });

  test('[+] switch-to-personal re-mints an access token', async () => {
    const { res } = await signup();
    const token = (await res.json()).data.access_token;
    const sw = await api.post('/api/v1/auth/switch-to-personal', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 201]).toContain(sw.status());
    expect((await sw.json()).data.access_token).toBeTruthy();
  });

  // ── NEGATIVE (red → the server must reject these) ───────────────────────────
  test('[-] login with bad credentials → 401 + error envelope', async () => {
    const res = await api.post('/api/v1/auth/login', {
      data: { email: uniqueEmail(), password: 'definitely-wrong' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBeTruthy();
  });

  test('[-] me/context without a Bearer token → 401', async () => {
    expect((await api.get('/api/v1/auth/me/context')).status()).toBe(401);
  });

  test('[-] signup with a weak password → 400/422', async () => {
    const res = await api.post('/api/v1/auth/signup', {
      data: { email: uniqueEmail(), password: 'short' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('[-] duplicate signup → 409', async () => {
    const email = uniqueEmail();
    await signup(email);
    const { res } = await signup(email);
    expect(res.status()).toBe(409);
  });

  test('[-] protected tenancy route without auth → 401', async () => {
    expect((await api.get('/api/v1/tenancy/organizations')).status()).toBe(401);
  });

  test('[-] switch to a non-member organization → 403/404', async () => {
    const { res } = await signup();
    const token = (await res.json()).data.access_token;
    const sw = await api.post('/api/v1/auth/switch-to-organization', {
      headers: { Authorization: `Bearer ${token}` },
      data: { organization_id: 'org_zzzzzzzzzzzzzzzzzzzzz' },
    });
    expect([403, 404]).toContain(sw.status());
  });

  test('[-] login with the correct email but the wrong password → 401', async () => {
    const email = uniqueEmail();
    await signup(email);
    const res = await api.post('/api/v1/auth/login', {
      data: { email, password: 'WrongPass!9999zz' },
    });
    expect(res.status()).toBe(401);
  });

  test('[-] refresh without the session cookie → 403', async () => {
    expect((await api.post('/api/v1/auth/refresh')).status()).toBe(403);
  });

  test('[+] switch into a team you own re-mints a token scoped to it', async () => {
    const { res } = await signup();
    const token = (await res.json()).data.access_token;
    const slug = `owned-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const create = await api.post('/api/v1/tenancy/organizations', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      data: { name: 'Owned Team', slug },
    });
    expect(create.status()).toBe(201);
    const orgId = (await create.json()).data.id;

    const sw = await api.post('/api/v1/auth/switch-to-organization', {
      headers: { Authorization: `Bearer ${token}` },
      data: { organization_id: orgId },
    });
    expect([200, 201]).toContain(sw.status());
    const teamToken = (await sw.json()).data.access_token;

    // the re-minted token resolves the new team as the active organization
    const ctx = await api.get('/api/v1/auth/me/context', {
      headers: { Authorization: `Bearer ${teamToken}` },
    });
    expect((await ctx.json()).data.active_organization.id).toBe(orgId);
  });
});

import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * Billing contract e2e against the running core-be (:3000): the public plan
 * catalog plus the auth/permission gates around subscriptions. Self-contained
 * (own helpers); auto-skips when the server is unreachable.
 */
const API = '/api/v1';
const PASSWORD = 'Zx9q!m2716Kv_tg';

let api: APIRequestContext;
let serverUp = false;

const uniqueEmail = () =>
  `fe-e2e-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@acme.test`;

async function signupToken(): Promise<string> {
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

test.describe('core-be — billing', () => {
  test.beforeEach(() => test.skip(!serverUp, 'core-be not reachable on :3000'));

  test('[+] GET /billing/plans is public and returns priced plans', async () => {
    const res = await api.get(`${API}/billing/plans`);
    expect(res.status()).toBe(200);
    const { data } = (await res.json()) as {
      data: Array<{ id: string; price_monthly: string; currency: string }>;
    };
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    const plan = data[0]!;
    expect(plan.id).toMatch(/^pln_[a-z0-9]{21}$/);
    expect(typeof plan.price_monthly).toBe('string'); // decimal carried as a string
    expect(plan.currency).toBeTruthy();
  });

  test('[-] GET /billing/plans/{unknown} → 404', async () => {
    const res = await api.get(`${API}/billing/plans/pln_${'z'.repeat(21)}`);
    expect(res.status()).toBe(404);
  });

  test('[-] GET /billing/subscriptions without auth → 401', async () => {
    expect((await api.get(`${API}/billing/subscriptions`)).status()).toBe(401);
  });

  test('[-] GET /billing/subscriptions on a personal org → 403 (billing gated)', async () => {
    // A personal org cannot manage billing (capabilities.can_manage_billing = false),
    // so listing subscriptions with a personal-scoped token is forbidden.
    const token = await signupToken();
    const res = await api.get(`${API}/billing/subscriptions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });
});

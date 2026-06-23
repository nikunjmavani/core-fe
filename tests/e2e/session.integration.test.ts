import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * Session-lifecycle & health contract e2e against the running core-be (:3000):
 * health probes, unknown-route handling, bearer validation, and the
 * logout→session-revoked flow. Self-contained; auto-skips when unreachable.
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

test.describe('core-be — health & session lifecycle', () => {
  test.beforeEach(() => test.skip(!serverUp, 'core-be not reachable on :3000'));

  test('[+] /livez and /readyz report healthy', async () => {
    expect((await api.get('/livez')).status()).toBe(200);
    expect((await api.get('/readyz')).status()).toBe(200);
  });

  test('[-] an unknown API route → 404', async () => {
    expect((await api.get(`${API}/this-route-does-not-exist`)).status()).toBe(404);
  });

  test('[-] me/context with a malformed bearer token → 401', async () => {
    const res = await api.get(`${API}/auth/me/context`, {
      headers: { Authorization: 'Bearer not.a.valid.jwt' },
    });
    expect(res.status()).toBe(401);
  });

  test('[+/-] logout returns 201 and revokes the session', async () => {
    const token = await signupToken();
    const auth = { Authorization: `Bearer ${token}` };

    // green: the freshly minted session is valid
    expect((await api.get(`${API}/auth/me/context`, { headers: auth })).status()).toBe(
      200,
    );
    // green: logout succeeds
    expect((await api.post(`${API}/auth/logout`, { headers: auth })).status()).toBe(201);
    // red: the same token is now rejected — the session was revoked server-side
    expect((await api.get(`${API}/auth/me/context`, { headers: auth })).status()).toBe(
      401,
    );
  });
});

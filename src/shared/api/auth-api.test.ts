import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { endMockSession } from '@/shared/auth/mock-auth.ts';
import { MOCK_LOGIN_EMAIL, MOCK_LOGIN_PASSWORD } from '@/shared/auth/mock-credentials.ts';

const useMockApiRef = vi.hoisted(() => ({ value: true }));

vi.mock('@/core/config/env.ts', () => ({
  config: {
    get useMockApi() {
      return useMockApiRef.value;
    },
    apiBaseUrl: '',
  },
}));

import { authApi } from './auth-api.ts';

describe('authApi.login (mock)', () => {
  beforeEach(() => {
    useMockApiRef.value = true;
    endMockSession();
  });

  it('returns a token for demo credentials', async () => {
    const result = await authApi.login({
      email: MOCK_LOGIN_EMAIL,
      password: MOCK_LOGIN_PASSWORD,
    });
    expect(result.accessToken).toBeTruthy();
  });

  it('throws for invalid credentials', async () => {
    await expect(
      authApi.login({ email: 'wrong@example.com', password: 'wrongpassword' }),
    ).rejects.toThrow(/invalid email or password/i);
  });
});

describe('authApi passwordless / oauth (mock)', () => {
  beforeEach(() => {
    useMockApiRef.value = true;
    endMockSession();
  });

  it('listOAuthProviders returns the mock provider list', async () => {
    expect(await authApi.listOAuthProviders()).toEqual(['google']);
  });

  it('magicLinkSend resolves without throwing', async () => {
    await expect(authApi.magicLinkSend('a@b.test')).resolves.toBeUndefined();
  });

  it('magicLinkVerify returns a token for an { email, code }', async () => {
    const res = await authApi.magicLinkVerify({ email: 'a@b.test', code: '123456' });
    expect(res.accessToken).toBeTruthy();
  });

  it('oauthStart returns a redirect URL', async () => {
    expect(await authApi.oauthStart('google')).toBeTruthy();
  });

  it('resendVerification resolves without throwing', async () => {
    await expect(authApi.resendVerification('tok')).resolves.toBeUndefined();
  });
});

describe('authApi.listOAuthProviders (live)', () => {
  beforeEach(() => {
    useMockApiRef.value = false;
  });
  afterEach(() => {
    useMockApiRef.value = true;
    vi.unstubAllGlobals();
  });

  it('parses { data: { providers } } from the live response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: { providers: ['google', 'github'] } }), {
            status: 200,
          }),
      ),
    );
    expect(await authApi.listOAuthProviders()).toEqual(['google', 'github']);
  });

  it('returns [] when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    );
    expect(await authApi.listOAuthProviders()).toEqual([]);
  });
});

describe('authApi.mfaVerify second factor (live)', () => {
  beforeEach(() => {
    useMockApiRef.value = false;
  });
  afterEach(() => {
    useMockApiRef.value = true;
    vi.unstubAllGlobals();
  });

  async function captureMfaBody(data: {
    code: string;
    useRecoveryCode?: boolean;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init: RequestInit) => {
        body = JSON.parse(init.body as string) as Record<string, unknown>;
        return new Response(JSON.stringify({ data: { access_token: 'acc' } }), {
          status: 201,
        });
      }),
    );
    await authApi.mfaVerify(data, 'mfa_sess');
    return body;
  }

  it('sends totp_code for an authenticator code', async () => {
    expect(await captureMfaBody({ code: '123456', useRecoveryCode: false })).toEqual({
      mfa_session_token: 'mfa_sess',
      totp_code: '123456',
    });
  });

  it('sends recovery_code when falling back to a recovery code', async () => {
    expect(await captureMfaBody({ code: 'abcd-efgh', useRecoveryCode: true })).toEqual({
      mfa_session_token: 'mfa_sess',
      recovery_code: 'abcd-efgh',
    });
  });
});

describe('authApi.login MFA handoff (live)', () => {
  beforeEach(() => {
    useMockApiRef.value = false;
  });
  afterEach(() => {
    useMockApiRef.value = true;
    vi.unstubAllGlobals();
  });

  it('throws MfaRequiredError carrying the session token when MFA is required', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: { mfa_required: true, mfa_session_token: 'mfa_sess_123' },
            }),
            { status: 201 },
          ),
      ),
    );
    await expect(
      authApi.login({ email: 'a@b.test', password: 'whatever12' }),
    ).rejects.toMatchObject({
      name: 'MfaRequiredError',
      mfaSessionToken: 'mfa_sess_123',
    });
  });
});

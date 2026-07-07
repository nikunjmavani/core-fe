import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/config/env.ts', () => ({
  platformConfig: { apiBaseUrl: '' },
}));

import { authApi, MfaRequiredError } from './auth-api.ts';

describe('authApi.mfaVerify second factor', () => {
  afterEach(() => {
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

describe('authApi.login MFA handoff', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws MfaRequiredError carrying the session token when MFA is required', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: { mfa_required: true, mfa_session_token: 'mfa_sess_pw' },
            }),
            { status: 201 },
          ),
      ),
    );
    await expect(
      authApi.login({ email: 'a@b.test', password: 'whatever12' }),
    ).rejects.toBeInstanceOf(MfaRequiredError);
  });
});

describe('authApi.emailLogin MFA handoff', () => {
  afterEach(() => {
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
      authApi.emailLogin({ email: 'a@b.test', code: 'AB2CD3' }),
    ).rejects.toMatchObject({
      name: 'MfaRequiredError',
      mfaSessionToken: 'mfa_sess_123',
    });
  });

  it('posts email + code to the email/login route', async () => {
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
    await authApi.emailLogin({ email: 'a@b.test', code: 'AB2CD3' });
    expect(body).toEqual({ email: 'a@b.test', code: 'AB2CD3' });
  });
});

describe('authApi.oauthStart redirect URL', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns redirect_url from the core-be OAuth start envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                redirect_url: 'https://github.com/login/oauth/authorize?client_id=x',
              },
            }),
            { status: 200 },
          ),
      ),
    );
    await expect(authApi.oauthStart('github')).resolves.toBe(
      'https://github.com/login/oauth/authorize?client_id=x',
    );
  });

  it('accepts legacy url field when redirect_url is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' },
            }),
            { status: 200 },
          ),
      ),
    );
    await expect(authApi.oauthStart('google')).resolves.toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
  });
});

describe('authApi.updateProfile wire mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function captureProfileBody(input: {
    firstName?: string;
    lastName?: string;
    name?: string;
    jobTitle?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init: RequestInit) => {
        body = JSON.parse(init.body as string) as Record<string, unknown>;
        return new Response(null, { status: 200 });
      }),
    );
    await authApi.updateProfile(input, 'token');
    return body;
  }

  it('maps explicit firstName/lastName 1:1 to first_name/last_name', async () => {
    expect(await captureProfileBody({ firstName: 'Ada', lastName: 'Lovelace' })).toEqual({
      first_name: 'Ada',
      last_name: 'Lovelace',
    });
  });

  it('sends last_name null when an explicit lastName is blank', async () => {
    expect(await captureProfileBody({ firstName: 'Ada', lastName: '' })).toEqual({
      first_name: 'Ada',
      last_name: null,
    });
  });

  it('prefers explicit firstName/lastName over a legacy name string', async () => {
    expect(
      await captureProfileBody({
        firstName: 'Ada',
        lastName: 'Lovelace',
        name: 'Ignored',
      }),
    ).toEqual({ first_name: 'Ada', last_name: 'Lovelace' });
  });

  it('splits a legacy full name into first_name/last_name and maps jobTitle → job_title', async () => {
    expect(await captureProfileBody({ name: 'NIK PATEL', jobTitle: 'CEO' })).toEqual({
      first_name: 'NIK',
      last_name: 'PATEL',
      job_title: 'CEO',
    });
  });

  it('keeps a multi-word surname intact after the first space', async () => {
    expect(await captureProfileBody({ name: 'Nik Vijay Patel' })).toEqual({
      first_name: 'Nik',
      last_name: 'Vijay Patel',
    });
  });

  it('sends last_name null for a single-token name', async () => {
    expect(await captureProfileBody({ name: 'Nik' })).toEqual({
      first_name: 'Nik',
      last_name: null,
    });
  });

  it('omits name fields when only jobTitle is provided', async () => {
    expect(await captureProfileBody({ jobTitle: 'CEO' })).toEqual({ job_title: 'CEO' });
  });
});

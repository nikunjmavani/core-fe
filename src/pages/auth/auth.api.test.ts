import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { authApi } from './auth.api.ts';

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

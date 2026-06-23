import { beforeEach, describe, expect, it, vi } from 'vitest';

const useMockApiRef = vi.hoisted(() => ({ value: false }));
vi.mock('@/core/config/env.ts', () => ({
  config: {
    get useMockApi() {
      return useMockApiRef.value;
    },
  },
}));

const { getMock, postMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, post: postMock, delete: deleteMock },
}));

import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  getMfaStatus,
} from './mfa-api.ts';
import { mfaMockStore } from './mfa-mock-store.ts';

beforeEach(() => {
  useMockApiRef.value = false;
  getMock.mockReset();
  postMock.mockReset();
  deleteMock.mockReset();
  mfaMockStore.reset();
});

describe('mfa-api (live branch)', () => {
  it('reads status', async () => {
    getMock.mockResolvedValue({ data: { enabled: true } });
    await expect(getMfaStatus()).resolves.toBe(true);
  });

  it('begins enrollment and maps otpauth_uri', async () => {
    postMock.mockResolvedValue({ data: { secret: 'S', otpauth_uri: 'otpauth://x' } });
    const result = await beginMfaEnrollment();
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me/mfa/enroll'),
      {},
    );
    expect(result).toEqual({ secret: 'S', otpauthUri: 'otpauth://x' });
  });

  it('confirms with a totp_code body and maps recovery_codes', async () => {
    postMock.mockResolvedValue({ data: { recovery_codes: ['a', 'b'] } });
    const result = await confirmMfaEnrollment('123456');
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me/mfa/confirm'),
      {
        totp_code: '123456',
      },
    );
    expect(result).toEqual({ recoveryCodes: ['a', 'b'] });
  });

  it('disables via DELETE', async () => {
    deleteMock.mockResolvedValue({ data: null });
    await disableMfa();
    expect(deleteMock).toHaveBeenCalledWith(expect.stringContaining('/auth/me/mfa'));
  });
});

describe('mfa-api (mock branch)', () => {
  beforeEach(() => {
    useMockApiRef.value = true;
  });

  it('enrolls then enables with recovery codes', async () => {
    expect(await getMfaStatus()).toBe(false);
    const enrollment = await beginMfaEnrollment();
    expect(enrollment.secret).toBeTruthy();
    expect(enrollment.otpauthUri).toContain('otpauth://');
    const { recoveryCodes } = await confirmMfaEnrollment('123456');
    expect(recoveryCodes.length).toBeGreaterThan(0);
    expect(await getMfaStatus()).toBe(true);
  });

  it('rejects a malformed confirmation code (and stays disabled)', async () => {
    await expect(confirmMfaEnrollment('12')).rejects.toThrow();
    expect(await getMfaStatus()).toBe(false);
  });

  it('disables MFA', async () => {
    await confirmMfaEnrollment('123456');
    expect(await getMfaStatus()).toBe(true);
    await disableMfa();
    expect(await getMfaStatus()).toBe(false);
  });
});

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

import { passkeyMockStore } from './passkey-mock-store.ts';
import { listPasskeys, registerPasskey, removePasskey } from './passkeys-api.ts';

const WIRE = {
  id: 'pk_x',
  name: 'YubiKey 5C',
  created_at: '2026-06-24T00:00:00.000Z',
  last_used_at: null,
};

beforeEach(() => {
  useMockApiRef.value = false;
  getMock.mockReset();
  postMock.mockReset();
  deleteMock.mockReset();
  passkeyMockStore.resetForTests();
});

describe('passkeys-api (live branch)', () => {
  it('lists and maps wire → domain', async () => {
    getMock.mockResolvedValue({ data: [WIRE] });
    const res = await listPasskeys();
    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/auth/me/passkeys'));
    expect(res).toEqual([
      {
        id: 'pk_x',
        name: 'YubiKey 5C',
        createdAt: '2026-06-24T00:00:00.000Z',
        lastUsedAt: null,
      },
    ]);
  });

  it('returns [] for a non-array body', async () => {
    getMock.mockResolvedValue({ data: null });
    expect(await listPasskeys()).toEqual([]);
  });

  it('registers via POST and maps the result', async () => {
    postMock.mockResolvedValue({ data: WIRE });
    const pk = await registerPasskey('YubiKey 5C');
    expect(postMock).toHaveBeenCalledWith(expect.stringContaining('/auth/me/passkeys'), {
      name: 'YubiKey 5C',
    });
    expect(pk.name).toBe('YubiKey 5C');
  });

  it('revokes via DELETE (id encoded into the path)', async () => {
    deleteMock.mockResolvedValue({ data: null });
    await removePasskey('pk_x');
    expect(deleteMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me/passkeys/pk_x'),
    );
  });
});

describe('passkeys-api (mock branch)', () => {
  beforeEach(() => {
    useMockApiRef.value = true;
  });

  it('lists the seeded passkey', async () => {
    const res = await listPasskeys();
    expect(res).toHaveLength(1);
    expect(res[0]?.name).toBe('MacBook Touch ID');
  });

  it('registers a named passkey, then lists it', async () => {
    const pk = await registerPasskey('YubiKey 5C');
    expect(pk.name).toBe('YubiKey 5C');
    expect(pk.lastUsedAt).toBeNull();
    const res = await listPasskeys();
    expect(res.map((p) => p.name)).toContain('YubiKey 5C');
  });

  it('falls back to a default name when blank', async () => {
    const pk = await registerPasskey('   ');
    expect(pk.name.length).toBeGreaterThan(0);
  });

  it('removes a passkey', async () => {
    await removePasskey('pk_seed');
    expect(await listPasskeys()).toHaveLength(0);
  });
});

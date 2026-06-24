import { beforeEach, describe, expect, it, vi } from 'vitest';

const useMockApiRef = vi.hoisted(() => ({ value: false }));
vi.mock('@/core/config/env.ts', () => ({
  config: {
    get useMockApi() {
      return useMockApiRef.value;
    },
  },
}));

const { getMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, delete: deleteMock },
}));

import { sessionMockStore } from './session-mock-store.ts';
import { listSessions, revokeSession } from './sessions-api.ts';

const WIRE = {
  id: 'ses_x',
  device: 'Mac',
  browser: 'Chrome',
  ip_address: '203.0.113.7',
  user_agent: 'Mozilla/5.0',
  last_active_at: '2026-06-24T00:00:00.000Z',
  is_current: true,
};

beforeEach(() => {
  useMockApiRef.value = false;
  getMock.mockReset();
  deleteMock.mockReset();
  sessionMockStore.reset();
});

describe('sessions-api (live branch)', () => {
  it('lists and maps wire → domain', async () => {
    getMock.mockResolvedValue({ data: [WIRE] });
    const res = await listSessions();
    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/auth/me/sessions'));
    expect(res).toEqual([
      {
        id: 'ses_x',
        device: 'Mac',
        browser: 'Chrome',
        ipAddress: '203.0.113.7',
        lastActiveAt: '2026-06-24T00:00:00.000Z',
        current: true,
      },
    ]);
  });

  it('revokes via DELETE', async () => {
    deleteMock.mockResolvedValue({ data: null });
    await revokeSession('ses_x');
    expect(deleteMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me/sessions/ses_x'),
    );
  });
});

describe('sessions-api (mock branch)', () => {
  beforeEach(() => {
    useMockApiRef.value = true;
  });

  it('lists seed sessions including exactly one current', async () => {
    const res = await listSessions();
    expect(res.length).toBeGreaterThanOrEqual(2);
    expect(res.filter((s) => s.current)).toHaveLength(1);
  });

  it('revokes a non-current session', async () => {
    const before = await listSessions();
    const target = before.find((s) => !s.current);
    expect(target).toBeDefined();
    if (target) await revokeSession(target.id);
    const after = await listSessions();
    expect(after.some((s) => s.id === target?.id)).toBe(false);
  });

  it('never removes the current session', async () => {
    const before = await listSessions();
    const current = before.find((s) => s.current);
    expect(current).toBeDefined();
    if (current) await revokeSession(current.id);
    const after = await listSessions();
    expect(after.some((s) => s.current)).toBe(true);
  });
});

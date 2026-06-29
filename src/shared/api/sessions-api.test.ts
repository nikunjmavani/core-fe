import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, delete: deleteMock },
}));

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
  getMock.mockReset();
  deleteMock.mockReset();
});

describe('sessions-api', () => {
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

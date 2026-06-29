import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock, patchMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  putMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, post: postMock, patch: patchMock, put: putMock },
}));

import {
  getNotificationPreferences,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from './notifications-api.ts';

const NTF = `ntf_${'0'.repeat(20)}1`;
const WIRE = {
  id: NTF,
  category: 'member',
  title: 'T',
  body: 'B',
  is_read: false,
  href: null,
  created_at: '2026-06-23T09:00:00.000Z',
};

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  putMock.mockReset();
});

describe('notifications-api', () => {
  it('lists and maps wire → domain', async () => {
    getMock.mockResolvedValue({ data: [WIRE] });
    const result = await listNotifications();
    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining('/notify/notifications'),
    );
    expect(result).toEqual([
      {
        id: NTF,
        category: 'member',
        title: 'T',
        body: 'B',
        isRead: false,
        href: null,
        createdAt: '2026-06-23T09:00:00.000Z',
      },
    ]);
  });

  it('reads the unread-count envelope', async () => {
    getMock.mockResolvedValue({ data: { count: 5 } });
    await expect(getUnreadCount()).resolves.toBe(5);
  });

  it('marks one read via PATCH', async () => {
    patchMock.mockResolvedValue({ data: null });
    await markNotificationRead(NTF);
    expect(patchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/notify/notifications/${NTF}/read`),
      {},
    );
  });

  it('marks all read via POST', async () => {
    postMock.mockResolvedValue({ data: null });
    await markAllNotificationsRead();
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining('/notify/notifications/mark-all-read'),
      {},
    );
  });
});

describe('notification preferences', () => {
  it('maps the in_app wire channel to inApp', async () => {
    getMock.mockResolvedValue({
      data: [{ category: 'member', channel: 'in_app', enabled: true }],
    });
    const prefs = await getNotificationPreferences();
    expect(prefs).toEqual([{ category: 'member', channel: 'inApp', enabled: true }]);
  });

  it('PUTs the wire body on full-replace', async () => {
    putMock.mockResolvedValue({
      data: [{ category: 'billing', channel: 'in_app', enabled: false }],
    });
    const result = await updateNotificationPreferences([
      { category: 'billing', channel: 'inApp', enabled: false },
    ]);
    expect(putMock).toHaveBeenCalledWith(
      expect.stringContaining('/users/me/notification-preferences'),
      { preferences: [{ category: 'billing', channel: 'in_app', enabled: false }] },
    );
    expect(result).toEqual([{ category: 'billing', channel: 'inApp', enabled: false }]);
  });
});

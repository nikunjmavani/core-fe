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
  it('maps the core-be wire shape (notification_type/IN_APP/is_enabled) to the domain', async () => {
    getMock.mockResolvedValue({
      data: [{ notification_type: 'member', channel: 'IN_APP', is_enabled: true }],
    });
    const prefs = await getNotificationPreferences();
    expect(prefs).toEqual([{ category: 'member', channel: 'inApp', enabled: true }]);
  });

  it('drops rows the UI cannot model (SMS channel or unknown type)', async () => {
    // Regression guard: core-be stores free-form notification_type strings and an
    // SMS channel the UI does not expose — those rows must be filtered, not throw.
    getMock.mockResolvedValue({
      data: [
        { notification_type: 'security', channel: 'SMS', is_enabled: true },
        { notification_type: 'system.welcome', channel: 'EMAIL', is_enabled: true },
        { notification_type: 'billing', channel: 'EMAIL', is_enabled: false },
      ],
    });
    const prefs = await getNotificationPreferences();
    expect(prefs).toEqual([{ category: 'billing', channel: 'email', enabled: false }]);
  });

  it('PUTs the corrected wire body on full-replace (was a 400)', async () => {
    // Regression: the body used {category, channel:lowercase, enabled}, which
    // core-be rejected. It must be {notification_type, channel:UPPER, is_enabled}.
    putMock.mockResolvedValue({
      data: [{ notification_type: 'billing', channel: 'PUSH', is_enabled: false }],
    });
    const result = await updateNotificationPreferences([
      { category: 'billing', channel: 'desktop', enabled: false },
    ]);
    expect(putMock).toHaveBeenCalledWith(
      expect.stringContaining('/users/me/notification-preferences'),
      {
        preferences: [
          { notification_type: 'billing', channel: 'PUSH', is_enabled: false },
        ],
      },
    );
    expect(result).toEqual([{ category: 'billing', channel: 'desktop', enabled: false }]);
  });
});

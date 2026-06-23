import { beforeEach, describe, expect, it, vi } from 'vitest';

const useMockApiRef = vi.hoisted(() => ({ value: false }));
vi.mock('@/core/config/env.ts', () => ({
  config: {
    get useMockApi() {
      return useMockApiRef.value;
    },
  },
}));

const { getMock, postMock, patchMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  putMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, post: postMock, patch: patchMock, put: putMock },
}));

import { notificationMockStore } from './notification-mock-store.ts';
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
  useMockApiRef.value = false;
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  putMock.mockReset();
  notificationMockStore.reset();
});

describe('notifications-api (live branch)', () => {
  it('lists and maps wire → domain', async () => {
    getMock.mockResolvedValue({ data: [WIRE] });
    const result = await listNotifications();
    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/me/notifications'));
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
    getMock.mockResolvedValue({ data: { unread_count: 5 } });
    await expect(getUnreadCount()).resolves.toBe(5);
  });

  it('marks one read via PATCH', async () => {
    patchMock.mockResolvedValue({ data: null });
    await markNotificationRead(NTF);
    expect(patchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/me/notifications/${NTF}/read`),
      {},
    );
  });

  it('marks all read via POST', async () => {
    postMock.mockResolvedValue({ data: null });
    await markAllNotificationsRead();
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining('/me/notifications/read-all'),
      {},
    );
  });
});

describe('notifications-api (mock branch)', () => {
  beforeEach(() => {
    useMockApiRef.value = true;
  });

  it('lists fixtures newest-first', async () => {
    const list = await listNotifications();
    expect(list).toHaveLength(4);
    const [first, second] = list;
    expect(first && second && first.createdAt >= second.createdAt).toBe(true);
  });

  it('counts unread, then marks one and all read', async () => {
    expect(await getUnreadCount()).toBe(2);
    const list = await listNotifications();
    const firstUnread = list.find((n) => !n.isRead);
    expect(firstUnread).toBeDefined();
    if (firstUnread) await markNotificationRead(firstUnread.id);
    expect(await getUnreadCount()).toBe(1);
    await markAllNotificationsRead();
    expect(await getUnreadCount()).toBe(0);
  });
});

describe('notification preferences (mock branch)', () => {
  beforeEach(() => {
    useMockApiRef.value = true;
  });

  it('returns the default preference matrix (4 categories × 3 channels)', async () => {
    const prefs = await getNotificationPreferences();
    expect(prefs).toHaveLength(12);
    expect(prefs.filter((p) => p.channel === 'desktop').every((p) => !p.enabled)).toBe(
      true,
    );
  });

  it('full-replaces the preference set', async () => {
    const next = [
      { category: 'system' as const, channel: 'email' as const, enabled: false },
    ];
    const result = await updateNotificationPreferences(next);
    expect(result).toEqual(next);
    expect(await getNotificationPreferences()).toEqual(next);
  });
});

describe('notification preferences (live branch)', () => {
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
      expect.stringContaining('/me/notification-preferences'),
      { preferences: [{ category: 'billing', channel: 'in_app', enabled: false }] },
    );
    expect(result).toEqual([{ category: 'billing', channel: 'inApp', enabled: false }]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const useMockApiRef = vi.hoisted(() => ({ value: false }));
vi.mock('@/core/config/env.ts', () => ({
  config: {
    get useMockApi() {
      return useMockApiRef.value;
    },
  },
}));

const { getMock, postMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, post: postMock, patch: patchMock },
}));

import { notificationMockStore } from './notification-mock-store.ts';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
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

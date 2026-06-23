import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';

import {
  type Notification,
  notificationWireSchema,
  toNotification,
  unreadCountWireSchema,
} from './notification-contracts.ts';
import { notificationMockStore } from './notification-mock-store.ts';

const NOTIF_API = `${API_BASE_PATH}/me/notifications`;

/** Inbox list, newest first (`GET /me/notifications`). */
export async function listNotifications(): Promise<Notification[]> {
  if (config.useMockApi) return mockResponse(notificationMockStore.list());
  const res = await apiClient.get<unknown>(NOTIF_API);
  return z.array(notificationWireSchema).parse(res.data).map(toNotification);
}

/** Unread badge count (`GET /me/notifications/unread-count`). */
export async function getUnreadCount(): Promise<number> {
  if (config.useMockApi) return mockResponse(notificationMockStore.unreadCount());
  const res = await apiClient.get<unknown>(`${NOTIF_API}/unread-count`);
  return unreadCountWireSchema.parse(res.data).unread_count;
}

/** Mark one notification read (`PATCH /me/notifications/:id/read`). */
export async function markNotificationRead(id: string): Promise<void> {
  if (config.useMockApi) {
    notificationMockStore.markRead(id);
    return mockResponse(undefined);
  }
  await apiClient.patch<unknown>(`${NOTIF_API}/${id}/read`, {});
}

/** Mark the whole inbox read (`POST /me/notifications/read-all`). */
export async function markAllNotificationsRead(): Promise<void> {
  if (config.useMockApi) {
    notificationMockStore.markAllRead();
    return mockResponse(undefined);
  }
  await apiClient.post<unknown>(`${NOTIF_API}/read-all`, {});
}

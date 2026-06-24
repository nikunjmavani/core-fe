import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';

import {
  type Notification,
  type NotificationPreference,
  notificationPreferenceWireSchema,
  notificationWireSchema,
  toNotification,
  toNotificationPreference,
  toNotificationPreferenceWire,
  unreadCountWireSchema,
} from './notification-contracts.ts';
import { notificationMockStore } from './notification-mock-store.ts';

// core-be #795: notifications live under /notify (no /me); preferences under
// /users/me. Org context travels in the JWT — no X-Organization-Id header.
const NOTIF_API = `${API_BASE_PATH}/notify/notifications`;
const PREFS_API = `${API_BASE_PATH}/users/me/notification-preferences`;

/** Inbox list, newest first (`GET /notify/notifications`). */
export async function listNotifications(): Promise<Notification[]> {
  if (config.useMockApi) return mockResponse(notificationMockStore.list());
  const res = await apiClient.get<unknown>(NOTIF_API);
  return z.array(notificationWireSchema).parse(res.data).map(toNotification);
}

/** Unread badge count (`GET /notify/notifications/unread-count` → `{ count }`). */
export async function getUnreadCount(): Promise<number> {
  if (config.useMockApi) return mockResponse(notificationMockStore.unreadCount());
  const res = await apiClient.get<unknown>(`${NOTIF_API}/unread-count`);
  return unreadCountWireSchema.parse(res.data).count;
}

/** Mark one notification read (`PATCH /notify/notifications/:notification_id/read`). */
export async function markNotificationRead(id: string): Promise<void> {
  if (config.useMockApi) {
    notificationMockStore.markRead(id);
    return mockResponse(undefined);
  }
  await apiClient.patch<unknown>(`${NOTIF_API}/${id}/read`, {});
}

/** Mark the whole inbox read (`POST /notify/notifications/mark-all-read`). */
export async function markAllNotificationsRead(): Promise<void> {
  if (config.useMockApi) {
    notificationMockStore.markAllRead();
    return mockResponse(undefined);
  }
  await apiClient.post<unknown>(`${NOTIF_API}/mark-all-read`, {});
}

/** Category × channel delivery prefs (`GET /users/me/notification-preferences`). */
export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  if (config.useMockApi) return mockResponse(notificationMockStore.listPreferences());
  const res = await apiClient.get<unknown>(PREFS_API);
  return z
    .array(notificationPreferenceWireSchema)
    .parse(res.data)
    .map(toNotificationPreference);
}

/**
 * Replace the full preference set (`PUT /users/me/notification-preferences`) —
 * core-be treats this as a full-set replace, not a partial patch.
 */
export async function updateNotificationPreferences(
  prefs: NotificationPreference[],
): Promise<NotificationPreference[]> {
  if (config.useMockApi) {
    notificationMockStore.setPreferences(prefs);
    return mockResponse(notificationMockStore.listPreferences());
  }
  const res = await apiClient.put<unknown>(PREFS_API, {
    preferences: prefs.map(toNotificationPreferenceWire),
  });
  return z
    .array(notificationPreferenceWireSchema)
    .parse(res.data)
    .map(toNotificationPreference);
}

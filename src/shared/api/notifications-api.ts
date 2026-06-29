import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { parseListTolerant } from '@/lib/parse-list-tolerant.ts';

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

const NOTIF_API = `${API_BASE_PATH}/notify/notifications`;
const PREFS_API = `${API_BASE_PATH}/users/me/notification-preferences`;

export async function listNotifications(): Promise<Notification[]> {
  const res = await apiClient.get<unknown>(NOTIF_API);
  return parseListTolerant(notificationWireSchema, res.data, 'notifications').map(
    toNotification,
  );
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get<unknown>(`${NOTIF_API}/unread-count`);
  return unreadCountWireSchema.parse(res.data).count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch<unknown>(`${NOTIF_API}/${id}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post<unknown>(`${NOTIF_API}/mark-all-read`, {});
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const res = await apiClient.get<unknown>(PREFS_API);
  return z
    .array(notificationPreferenceWireSchema)
    .parse(res.data)
    .map(toNotificationPreference);
}

export async function updateNotificationPreferences(
  prefs: NotificationPreference[],
): Promise<NotificationPreference[]> {
  const res = await apiClient.put<unknown>(PREFS_API, {
    preferences: prefs.map(toNotificationPreferenceWire),
  });
  return z
    .array(notificationPreferenceWireSchema)
    .parse(res.data)
    .map(toNotificationPreference);
}

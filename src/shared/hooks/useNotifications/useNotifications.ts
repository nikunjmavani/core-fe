import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { NotificationPreference } from '@/shared/api/notification-contracts.ts';
import { notificationQueryKeys } from '@/shared/api/notification-query-keys.ts';
import * as api from '@/shared/api/notifications-api.ts';
import { notify } from '@/shared/notify/index.ts';

/**
 * Notifications inbox hooks. With no realtime channel in mock mode, the inbox +
 * unread badge poll on an interval (FE-63); a future SSE/WebSocket subscription
 * would replace the poll by invalidating these query keys on push. Server state
 * only — never mirrored into Zustand.
 */
const POLL_INTERVAL_MS = 30_000;

/** The signed-in user's notification inbox (newest first), polled. */
export function useNotifications() {
  return useQuery({
    queryKey: notificationQueryKeys.list(),
    queryFn: api.listNotifications,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

/** Unread count for the bell badge, polled. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: api.getUnreadCount,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

/** Mark one notification read, then refresh the inbox + badge. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
    onError: () => notify.error('Could not update notification'),
  });
}

/** Mark the whole inbox read, then refresh. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
    onError: () => notify.error('Could not update notifications'),
  });
}

/** Category × channel delivery preferences (FE-30). */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationQueryKeys.preferences(),
    queryFn: api.getNotificationPreferences,
  });
}

/** Full-replace the preference set, seeding the cache with the saved result. */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPreference[]) =>
      api.updateNotificationPreferences(prefs),
    onSuccess: (saved) => {
      queryClient.setQueryData(notificationQueryKeys.preferences(), saved);
      notify.success('Notification preferences saved');
    },
    onError: () => notify.error('Could not save preferences'),
  });
}

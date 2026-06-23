/** TanStack Query keys for the notifications domain (inbox + unread badge). */
export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationQueryKeys.all, 'list'] as const,
  unreadCount: () => [...notificationQueryKeys.all, 'unread-count'] as const,
  preferences: () => [...notificationQueryKeys.all, 'preferences'] as const,
};

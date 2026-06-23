import type { Notification, NotificationPreference } from './notification-contracts.ts';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATIONS_FIXTURE,
} from './notification-fixtures.ts';

/**
 * In-memory mock inbox for the notifications domain. The mock API layer
 * (`notifications-api.ts`) reads + mutates this so mark-read persists for the
 * session and TanStack Query invalidation reflects it. Demo-only — disappears
 * when the backend is wired; reset between tests via {@link reset}.
 */
function clone(items: Notification[]): Notification[] {
  return items.map((n) => ({ ...n }));
}

function clonePrefs(prefs: NotificationPreference[]): NotificationPreference[] {
  return prefs.map((p) => ({ ...p }));
}

let items: Notification[] = clone(NOTIFICATIONS_FIXTURE);
let preferences: NotificationPreference[] = clonePrefs(DEFAULT_NOTIFICATION_PREFERENCES);

export const notificationMockStore = {
  list(): Notification[] {
    // newest first
    return clone(items).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  unreadCount(): number {
    return items.filter((n) => !n.isRead).length;
  },
  markRead(id: string): void {
    items = items.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  },
  markAllRead(): void {
    items = items.map((n) => ({ ...n, isRead: true }));
  },
  listPreferences(): NotificationPreference[] {
    return clonePrefs(preferences);
  },
  setPreferences(next: NotificationPreference[]): void {
    preferences = clonePrefs(next);
  },
  reset(): void {
    items = clone(NOTIFICATIONS_FIXTURE);
    preferences = clonePrefs(DEFAULT_NOTIFICATION_PREFERENCES);
  },
};

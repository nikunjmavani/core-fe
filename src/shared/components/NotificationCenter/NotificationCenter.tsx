import { useState } from 'react';

import { cn } from '@/lib/utils.ts';
import type { Notification } from '@/shared/api/notification-contracts.ts';
import { EmptyState } from '@/shared/components/EmptyState/index.ts';
import { Surface } from '@/shared/components/Surface/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/shared/hooks/useNotifications/index.ts';
import { Bell, BellOff } from '@/shared/icons/index.ts';

/** Coarse relative time for the inbox ("just now", "5m ago", "3d ago"). */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

/**
 * Notification center — header bell with an unread badge that opens a right-side
 * drawer (Surface) listing the inbox. Clicking an unread item marks it read;
 * "Mark all read" clears the badge. Covers loading / empty / error states.
 * Data + polling come from the useNotifications hooks (FE-63).
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { data: items, isLoading, isError } = useNotifications();
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  function handleItemClick(item: Notification) {
    if (!item.isRead) markRead.mutate(item.id);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => setOpen(true)}
        data-testid="notification-bell"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span
            className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
            data-testid="notification-badge"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Button>

      <Surface
        open={open}
        onOpenChange={setOpen}
        as="drawer"
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : "You're all caught up"}
      >
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={!items || unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            data-testid="notification-mark-all"
          >
            Mark all read
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2" data-testid="notifications-loading">
            {['a', 'b', 'c'].map((key) => (
              <Skeleton key={key} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <p className="text-destructive text-sm" role="alert">
            Couldn&apos;t load notifications. Please try again.
          </p>
        ) : null}

        {items && items.length === 0 ? (
          <EmptyState
            icon={<BellOff />}
            title="No notifications"
            description="You'll see updates about your account and organization here."
          />
        ) : null}

        {items && items.length > 0 ? (
          <ul className="divide-border -mx-1 divide-y" data-testid="notifications-list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'flex w-full gap-3 rounded-md px-1 py-3 text-left transition-colors',
                    'hover:bg-muted/50 focus-visible:ring-ring outline-none focus-visible:ring-2',
                    !item.isRead && 'bg-muted/40',
                  )}
                  data-testid={`notification-${item.id}`}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      item.isRead ? 'bg-transparent' : 'bg-primary',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {item.body}
                    </span>
                    <span className="text-muted-foreground/70 mt-1 block text-[11px]">
                      {relativeTime(item.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Surface>
    </>
  );
}

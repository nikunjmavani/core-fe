import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { cn } from '@/lib/utils.ts';
import type { Notification } from '@/shared/api/notification-contracts.ts';
import { EmptyState } from '@/shared/components/EmptyState/index.ts';
import { settingsHash } from '@/shared/components/SettingsModal/settings-hash.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/shared/hooks/useNotifications/index.ts';
import {
  Bell,
  BellOff,
  Check,
  type LucideIcon,
  Settings,
  ShieldCheck,
  UserPlus,
  Zap,
} from '@/shared/icons/index.ts';

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

/** Category → glyph, so the inbox is scannable at a glance. */
function categoryIcon(category: Notification['category']): LucideIcon {
  if (category === 'member') return UserPlus;
  if (category === 'billing') return Zap;
  if (category === 'security') return ShieldCheck;
  return Bell; // system + any future category
}

/**
 * Notification center — header bell with an unread badge that opens a **popover**
 * inbox. Each row carries a category glyph (tinted while unread), title, body, and
 * relative time; unread rows mark themselves read on click and expose an explicit
 * check on hover/focus. The list scrolls within a capped height (custom
 * scrollbar); a footer jumps to notification settings. Data: useNotifications.
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: items, isLoading, isError } = useNotifications();
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  function handleItemClick(item: Notification) {
    if (!item.isRead) markRead.mutate(item.id);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
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
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[22rem] overflow-hidden p-0"
        data-testid="notification-popover"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                {unread} new
              </span>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={!items || unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            data-testid="notification-mark-all"
          >
            Mark all read
          </Button>
        </div>

        <div className="scrollbar-custom max-h-[24rem] overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="space-y-2 p-3" data-testid="notifications-loading">
              {['a', 'b', 'c'].map((key) => (
                <Skeleton key={key} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : null}

          {isError ? (
            <p className="text-destructive p-4 text-sm" role="alert">
              Couldn&apos;t load notifications. Please try again.
            </p>
          ) : null}

          {items && items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<BellOff />}
                title="No notifications"
                description="You'll see updates about your account and organization here."
              />
            </div>
          ) : null}

          {items && items.length > 0 ? (
            <ul className="divide-border divide-y" data-testid="notifications-list">
              {items.map((item) => {
                const Icon = categoryIcon(item.category);
                return (
                  <li key={item.id} className="group flex items-stretch">
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        'flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition-colors',
                        'hover:bg-muted/50 focus-visible:bg-muted/50 outline-none',
                        !item.isRead && 'bg-muted/30',
                      )}
                      data-testid={`notification-${item.id}`}
                    >
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg',
                          item.isRead
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/10 text-primary',
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {item.title}
                          </span>
                          {item.isRead ? null : (
                            <span
                              className="bg-primary size-1.5 shrink-0 rounded-full"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <span className="text-muted-foreground line-clamp-2 block text-xs">
                          {item.body}
                        </span>
                        <span className="text-muted-foreground/70 mt-1 block text-[11px]">
                          {relativeTime(item.createdAt)}
                        </span>
                      </span>
                    </button>
                    {item.isRead ? null : (
                      <button
                        type="button"
                        onClick={() => markRead.mutate(item.id)}
                        aria-label="Mark as read"
                        title="Mark as read"
                        data-testid={`notification-mark-${item.id}`}
                        className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 my-2 mr-2 flex shrink-0 items-center rounded-md px-2 opacity-0 transition outline-none group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Check className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        {items && items.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void navigate({ to: '.', hash: settingsHash('account', 'notifications') });
            }}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full items-center justify-center gap-1.5 border-t py-2.5 text-xs font-medium transition-colors outline-none"
            data-testid="notification-settings-link"
          >
            <Settings className="size-3.5" aria-hidden="true" />
            Notification settings
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

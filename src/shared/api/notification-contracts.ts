import { z } from 'zod';

import { isoDateString, publicId } from '@/core/types/wire.ts';

/**
 * Notification domain contracts (core-be `/me/notifications`).
 *
 * Categories drive the bell glyph and the preferences grid. The wire shape is
 * snake_case per core-be; the UI consumes the camelCase domain shape via
 * {@link toNotification}. Mock-first (REPLACE_WITH_API) — the live endpoint
 * shape is pinned here and validated on parse.
 */
export const notificationCategorySchema = z.enum([
  'system',
  'member',
  'billing',
  'security',
]);
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;

/** Domain shape consumed by the UI. */
export const notificationSchema = z.object({
  id: z.string(),
  category: notificationCategorySchema,
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  href: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

/** core-be wire shape (snake_case). */
export const notificationWireSchema = z.object({
  id: publicId('ntf'),
  category: notificationCategorySchema,
  title: z.string(),
  body: z.string(),
  is_read: z.boolean(),
  href: z.string().nullable().optional(),
  created_at: isoDateString,
});
export type NotificationWire = z.infer<typeof notificationWireSchema>;

/** Map a wire notification to the UI domain shape. */
export function toNotification(wire: NotificationWire): Notification {
  return {
    id: wire.id,
    category: wire.category,
    title: wire.title,
    body: wire.body,
    isRead: wire.is_read,
    href: wire.href ?? null,
    createdAt: wire.created_at,
  };
}

/** Unread-count envelope (`GET /me/notifications/unread-count`). */
export const unreadCountWireSchema = z.object({
  unread_count: z.number().int().nonnegative(),
});

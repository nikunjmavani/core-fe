import { z } from 'zod';

import { isoDateString, publicId } from '@/core/types/wire.ts';

/**
 * Notification domain contracts (core-be `/notify/notifications`).
 *
 * Categories drive the bell glyph and the preferences grid. The wire shape is
 * snake_case per core-be; the UI consumes the camelCase domain shape via
 * {@link toNotification}. Wire shape is snake_case per core-be; validated on parse.
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

/** Unread-count envelope (`GET /notify/notifications/unread-count` → `{ count }`). */
export const unreadCountWireSchema = z.object({
  count: z.number().int().nonnegative(),
});

/** Delivery channels the UI models. "desktop" is web push (core-be `PUSH`). */
export const notificationChannelSchema = z.enum(['email', 'inApp', 'desktop']);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

/** A single category × channel delivery preference (domain shape). */
export const notificationPreferenceSchema = z.object({
  category: notificationCategorySchema,
  channel: notificationChannelSchema,
  enabled: z.boolean(),
});
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

/**
 * Wire form — core-be `PUT/GET /users/me/notification-preferences`. A preference
 * is `{ notification_type, channel, is_enabled }`, keyed by
 * `(notification_type, channel)`; the PUT replaces the whole set. `channel` is
 * an UPPERCASE enum (`EMAIL`/`SMS`/`PUSH`/`IN_APP`) and `notification_type` is a
 * free string — the UI models a fixed set of categories, so we round-trip the
 * category slug as the type. (Earlier this sent `{category, channel:lowercase,
 * enabled}`, which core-be rejected with a 400 — the save silently failed.)
 */
export const notificationPreferenceWireSchema = z.object({
  notification_type: z.string(),
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
  is_enabled: z.boolean(),
});
export type NotificationPreferenceWire = z.infer<typeof notificationPreferenceWireSchema>;

/** UI channel → core-be channel. SMS has no UI equivalent (send/receive skip it). */
const CHANNEL_TO_WIRE: Record<
  NotificationChannel,
  NotificationPreferenceWire['channel']
> = { email: 'EMAIL', inApp: 'IN_APP', desktop: 'PUSH' };
const CHANNEL_FROM_WIRE: Partial<
  Record<NotificationPreferenceWire['channel'], NotificationChannel>
> = { EMAIL: 'email', IN_APP: 'inApp', PUSH: 'desktop' };

/**
 * Map a wire preference to the UI domain shape, or `null` when it can't be
 * modeled — an unknown `notification_type` (core-be stores free strings) or the
 * `SMS` channel the UI doesn't expose. Callers filter the nulls.
 */
export function toNotificationPreference(
  wire: NotificationPreferenceWire,
): NotificationPreference | null {
  const category = notificationCategorySchema.safeParse(wire.notification_type);
  const channel = CHANNEL_FROM_WIRE[wire.channel];
  if (!category.success || !channel) return null;
  return { category: category.data, channel, enabled: wire.is_enabled };
}

/** Map a domain preference back to the wire shape (for full-replace PUT). */
export function toNotificationPreferenceWire(
  pref: NotificationPreference,
): NotificationPreferenceWire {
  return {
    notification_type: pref.category,
    channel: CHANNEL_TO_WIRE[pref.channel],
    is_enabled: pref.enabled,
  };
}

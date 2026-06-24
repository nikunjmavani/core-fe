import {
  type Notification,
  notificationCategorySchema,
  type NotificationPreference,
} from './notification-contracts.ts';

/** A valid `ntf_<21 lowercase-alnum>` public id for mock data. */
function ntfId(n: number): string {
  return `ntf_${String(n).padStart(21, '0')}`;
}

/**
 * REPLACE_WITH_API: seed inbox for mock mode (`GET /me/notifications`).
 * Mixed read/unread across categories so the bell badge + filters have data.
 */
export const NOTIFICATIONS_FIXTURE: Notification[] = [
  {
    id: ntfId(1),
    category: 'member',
    title: 'New member joined',
    body: 'Ada Byron accepted your invitation to Acme Inc.',
    isRead: false,
    href: '#settings/organization/members',
    createdAt: '2026-06-23T09:00:00.000Z',
  },
  {
    id: ntfId(2),
    category: 'billing',
    title: 'Payment received',
    body: 'Your Pro plan renewed successfully.',
    isRead: false,
    href: '#settings/organization/billing',
    createdAt: '2026-06-22T12:00:00.000Z',
  },
  {
    id: ntfId(3),
    category: 'security',
    title: 'New sign-in detected',
    body: 'A new device signed in from San Francisco, CA.',
    isRead: true,
    href: '#settings/account/security',
    createdAt: '2026-06-20T18:30:00.000Z',
  },
  {
    id: ntfId(4),
    category: 'system',
    title: 'Welcome to Core',
    body: 'Take a quick tour of your new workspace.',
    isRead: true,
    href: null,
    createdAt: '2026-06-19T08:00:00.000Z',
  },
  {
    id: ntfId(5),
    category: 'member',
    title: 'Invitation accepted',
    body: 'Grace Hopper joined the Engineering team.',
    isRead: false,
    href: '#settings/organization/members',
    createdAt: '2026-06-18T15:45:00.000Z',
  },
  {
    id: ntfId(6),
    category: 'security',
    title: 'Password changed',
    body: 'Your account password was updated successfully.',
    isRead: true,
    href: '#settings/account/security',
    createdAt: '2026-06-18T10:05:00.000Z',
  },
  {
    id: ntfId(7),
    category: 'billing',
    title: 'Invoice available',
    body: 'Your June invoice (#INV-2048) is ready to download.',
    isRead: false,
    href: '#settings/organization/billing',
    createdAt: '2026-06-17T09:30:00.000Z',
  },
  {
    id: ntfId(8),
    category: 'member',
    title: 'Role updated',
    body: 'Alan Turing was promoted to Admin.',
    isRead: true,
    href: '#settings/organization/members',
    createdAt: '2026-06-16T14:20:00.000Z',
  },
  {
    id: ntfId(9),
    category: 'system',
    title: 'Scheduled maintenance',
    body: 'Core will be briefly unavailable on June 28, 02:00–02:30 UTC.',
    isRead: false,
    href: null,
    createdAt: '2026-06-15T11:00:00.000Z',
  },
  {
    id: ntfId(10),
    category: 'security',
    title: 'New sign-in detected',
    body: 'A new device signed in from London, UK.',
    isRead: true,
    href: '#settings/account/security',
    createdAt: '2026-06-14T20:10:00.000Z',
  },
  {
    id: ntfId(11),
    category: 'billing',
    title: 'Card expiring soon',
    body: 'The card ending in 4242 expires next month.',
    isRead: false,
    href: '#settings/organization/billing',
    createdAt: '2026-06-13T08:45:00.000Z',
  },
  {
    id: ntfId(12),
    category: 'member',
    title: 'Invitation sent',
    body: 'You invited katherine@nasa.gov to the organization.',
    isRead: true,
    href: '#settings/organization/members',
    createdAt: '2026-06-12T16:00:00.000Z',
  },
  {
    id: ntfId(13),
    category: 'system',
    title: 'New feature: Webhooks',
    body: 'Send organization events to your own endpoints.',
    isRead: true,
    href: null,
    createdAt: '2026-06-11T09:00:00.000Z',
  },
  {
    id: ntfId(14),
    category: 'security',
    title: 'Two-factor enabled',
    body: 'Authenticator-app 2FA is now protecting your account.',
    isRead: true,
    href: '#settings/account/security',
    createdAt: '2026-06-10T13:25:00.000Z',
  },
  {
    id: ntfId(15),
    category: 'member',
    title: 'Member removed',
    body: 'Charles Babbage was removed from the organization.',
    isRead: true,
    href: '#settings/organization/members',
    createdAt: '2026-06-09T17:40:00.000Z',
  },
  {
    id: ntfId(16),
    category: 'billing',
    title: 'Plan upgraded',
    body: 'Your organization moved from Starter to Pro.',
    isRead: true,
    href: '#settings/organization/billing',
    createdAt: '2026-06-08T10:15:00.000Z',
  },
];

/**
 * REPLACE_WITH_API: default notification preferences (`GET
 * /me/notification-preferences`). Email + in-app on for every category; desktop
 * off until the user opts in (it needs an OS permission grant).
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference[] =
  notificationCategorySchema.options.flatMap((category) => [
    { category, channel: 'email', enabled: true },
    { category, channel: 'inApp', enabled: true },
    { category, channel: 'desktop', enabled: false },
  ]);

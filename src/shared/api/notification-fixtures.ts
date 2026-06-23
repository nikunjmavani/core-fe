import type { Notification } from './notification-contracts.ts';

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
];

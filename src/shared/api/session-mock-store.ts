import type { Session } from './session-contracts.ts';

/**
 * In-memory mock store for active sessions. The current session is never
 * removable (the UI hides its revoke control; the store also guards it).
 * Demo-only (REPLACE_WITH_API); reset between tests via {@link reset}.
 */
const SEED: Session[] = [
  {
    id: 'ses_current',
    device: 'MacBook Pro',
    browser: 'Chrome 120',
    ipAddress: '203.0.113.7',
    lastActiveAt: '2026-06-24T03:00:00.000Z',
    current: true,
  },
  {
    id: 'ses_iphone',
    device: 'iPhone 15',
    browser: 'Safari Mobile',
    ipAddress: '203.0.113.42',
    lastActiveAt: '2026-06-23T19:30:00.000Z',
    current: false,
  },
  {
    id: 'ses_windows',
    device: 'Windows PC',
    browser: 'Edge 120',
    ipAddress: '198.51.100.9',
    lastActiveAt: '2026-06-20T11:15:00.000Z',
    current: false,
  },
];

function clone(items: Session[]): Session[] {
  return items.map((s) => ({ ...s }));
}

let items: Session[] = clone(SEED);

export const sessionMockStore = {
  list(): Session[] {
    return clone(items);
  },
  revoke(id: string): void {
    items = items.filter((s) => s.id !== id || s.current);
  },
  reset(): void {
    items = clone(SEED);
  },
};

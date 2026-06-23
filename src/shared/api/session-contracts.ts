import { z } from 'zod';

import { isoDateString } from '@/core/types/wire.ts';

/**
 * Active-session contracts (core-be `/auth/me/sessions`) for the Security →
 * Sessions panel. Net-new / mock-first: the wire `id` is kept lenient (the
 * prefix isn't pinned yet); everything else mirrors the established mapper
 * pattern. REPLACE_WITH_API.
 */
export const sessionSchema = z.object({
  id: z.string(),
  device: z.string(),
  browser: z.string(),
  location: z.string(),
  lastActiveAt: z.string(),
  current: z.boolean(),
});
export type Session = z.infer<typeof sessionSchema>;

export const sessionWireSchema = z.object({
  id: z.string().min(1),
  device: z.string(),
  browser: z.string(),
  location: z.string(),
  last_active_at: isoDateString,
  is_current: z.boolean(),
});
export type SessionWire = z.infer<typeof sessionWireSchema>;

export function toSession(wire: SessionWire): Session {
  return {
    id: wire.id,
    device: wire.device,
    browser: wire.browser,
    location: wire.location,
    lastActiveAt: wire.last_active_at,
    current: wire.is_current,
  };
}

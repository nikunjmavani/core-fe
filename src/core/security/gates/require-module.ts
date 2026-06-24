import { notFound } from '@tanstack/react-router';

import { config } from '@/core/config/env.ts';

import type { Gate } from '../gate.types.ts';

/** Whether a feature module is enabled for this deployment (for UI gating). */
export function isModuleEnabled(moduleKey: string): boolean {
  return !config.disabledModules.has(moduleKey);
}

/**
 * **L6b — module entitlement.** Factory: a deployment can disable feature
 * modules via `VITE_DISABLED_MODULES`. A disabled module's routes resolve to
 * `notFound()` (404 — don't reveal the surface exists, vs `/unauthorized`'s
 * "you can't"), and its nav/settings entries should be hidden via
 * {@link isModuleEnabled}.
 */
export function requireModuleGate(moduleKey: string): Gate {
  return () => {
    if (!isModuleEnabled(moduleKey)) throw notFound();
  };
}

import type { Gate } from './gate.types.ts';

/**
 * The common security gateway — composes access gates into a single
 * `beforeLoad`-style runner. Gates run **sequentially, one by one**, and the
 * **first gate to throw short-circuits** the rest (a redirect / notFound /
 * unauthorized halts entry). This is the single, testable access pipeline that
 * replaces ad-hoc per-route guard calls (research/11 §3.7).
 *
 * @example
 *   beforeLoad: gateway(requireSession, hydrateContext, resolveActiveOrg,
 *                       requireOrgStatus, requirePermission)
 */
export function gateway<TCtx>(...gates: Array<Gate<TCtx>>) {
  return async (ctx: TCtx): Promise<void> => {
    for (const gate of gates) {
      await gate(ctx);
    }
  };
}

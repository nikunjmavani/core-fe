/**
 * Application config — exports {@link platformConfig} resolved from validated env.
 *
 * Env files at project root (all gitignored except the committed .env.example):
 *   .env.example (template) · .env.development (single local file) · .env · .env.production
 *
 * Resolution: `window.__CONFIG__[key]` → `import.meta.env.VITE_${key}` → defaults.
 * See docs/deployment/runbooks/environment-variables.md.
 */
import {
  getClientEnv,
  getRuntimeConfigValue,
  validatePlatformInvariantsAtBoot,
} from './env.config.ts';
import {
  resolveAuthMethodFlag,
  resolveDisabledModules,
  resolveLayoutWidth,
  resolveLayoutWidthForced,
  resolveThemeLock,
} from './env-resolvers.ts';
import { type PlatformConfig, resolvePlatformConfig } from './platform-config.ts';

export {
  resolveAuthMethodFlag,
  resolveDisabledModules,
  resolveLayoutWidth,
  resolveLayoutWidthForced,
  resolveThemeLock,
};
export type { PlatformConfig };

const clientEnv = getClientEnv();
export const platformConfig = resolvePlatformConfig(getRuntimeConfigValue, clientEnv);

// Boot invariants — no environment branching (behavior is env-flag-driven; the
// production Turnstile requirement is enforced at deploy time by validate:client-env).
validatePlatformInvariantsAtBoot();

// Dev-only nudge: when test mode is off, remind how to enable it. Gated behind
// debugLogging (a named flag pinned OFF in production), so it never fires in prod —
// no build-mode sniffing. Mirrors the auth-surface warning's dev-console pattern.
if (!platformConfig.testMode && platformConfig.debugLogging) {
  console.info(
    '[Config] Test mode is OFF — set VITE_TEST_MODE=on in .env.development to enable test affordances (devtools + E2E hooks).',
  );
}

// Reject a non-HTTPS absolute API origin anywhere except localhost. Dev uses ''
// (Vite proxy) or http://localhost, so this only fires on a genuinely
// misconfigured http:// origin — no isProduction check needed.
if (
  platformConfig.apiBaseUrl?.startsWith('http://') &&
  !platformConfig.apiBaseUrl.startsWith('http://localhost')
) {
  throw new Error(
    '[Config] VITE_API_BASE_URL must use HTTPS. Received: ' +
      platformConfig.apiBaseUrl.slice(0, 40),
  );
}

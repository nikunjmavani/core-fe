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

// The config kernel is the one place a raw production check is legitimate — these
// are boot-time deploy guards, not app behavior. `platformConfig` no longer exposes
// isProduction/isDevelopment; read the parsed `clientEnv.PROD` here directly.
validatePlatformInvariantsAtBoot(clientEnv.PROD);

if (clientEnv.PROD && !getRuntimeConfigValue('API_BASE_URL')) {
  console.warn(
    '[Config] VITE_API_BASE_URL is not set in production — API calls will be relative to origin.',
  );
}

if (
  clientEnv.PROD &&
  platformConfig.apiBaseUrl?.startsWith('http://') &&
  !platformConfig.apiBaseUrl.startsWith('http://localhost')
) {
  throw new Error(
    '[Config] VITE_API_BASE_URL must use HTTPS in production. Received: ' +
      platformConfig.apiBaseUrl.slice(0, 40),
  );
}

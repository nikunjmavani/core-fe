/**
 * Application config — exports {@link platformConfig} resolved from validated env.
 *
 * Env files at project root:
 *   .env, .env.development, .env.production, .env.local
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

validatePlatformInvariantsAtBoot(platformConfig.isProduction);

if (platformConfig.isProduction && !getRuntimeConfigValue('API_BASE_URL')) {
  console.warn(
    '[Config] VITE_API_BASE_URL is not set in production — API calls will be relative to origin.',
  );
}

if (
  platformConfig.isProduction &&
  platformConfig.apiBaseUrl?.startsWith('http://') &&
  !platformConfig.apiBaseUrl.startsWith('http://localhost')
) {
  throw new Error(
    '[Config] VITE_API_BASE_URL must use HTTPS in production. Received: ' +
      platformConfig.apiBaseUrl.slice(0, 40),
  );
}

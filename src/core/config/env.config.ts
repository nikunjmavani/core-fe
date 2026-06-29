/**
 * Runtime environment bootstrap — validates `import.meta.env` and exposes
 * {@link getRuntimeConfigValue} for `window.__CONFIG__` overrides.
 */
import { z } from 'zod';

import {
  assertAuthPlatformInvariants,
  type ClientEnv,
  clientEnvSchema,
} from './env-schema.ts';

export { type ClientEnv, clientEnvSchema };

let _clientEnv: ClientEnv | null = null;

/** Lazily parse and cache validated client env. */
export function getClientEnv(): ClientEnv {
  if (_clientEnv) return _clientEnv;

  const parsed = clientEnvSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    const detail = JSON.stringify(z.flattenError(parsed.error));
    if (import.meta.env.PROD) {
      throw new Error(`[Config] Invalid environment configuration: ${detail}`);
    }
    console.warn('[Config] Invalid env (dev continues):', detail);
    _clientEnv = clientEnvSchema.parse({});
    return _clientEnv;
  }

  _clientEnv = parsed.data;
  return _clientEnv;
}

/** Test-only: reset cached client env. */
export function resetClientEnvCacheForTests(): void {
  _clientEnv = null;
}

const runtimeConfig: Record<string, string> =
  typeof window !== 'undefined'
    ? (((window as unknown as Record<string, unknown>).__CONFIG__ as
        | Record<string, string>
        | undefined) ?? {})
    : {};

/** Read a config value: runtime (`window.__CONFIG__`) → `import.meta.env.VITE_*`. */
export function getRuntimeConfigValue(key: string): string | undefined {
  /* eslint-disable security/detect-object-injection -- keys from controlled callers */
  return (
    runtimeConfig[key] ??
    (import.meta.env[`VITE_${key}`] as string | undefined) ??
    undefined
  );
  /* eslint-enable security/detect-object-injection */
}

/** Run cross-field auth/platform invariant checks once at boot. */
export function validatePlatformInvariantsAtBoot(isProduction: boolean): void {
  assertAuthPlatformInvariants(getRuntimeConfigValue, isProduction);
}

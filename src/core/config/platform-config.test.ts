import { describe, expect, it } from 'vitest';

import { __testEnabledOAuthFromGet } from './env-schema.ts';
import { resolvePlatformConfig } from './platform-config.ts';

describe('platform-config', () => {
  it('resolvePlatformConfig applies oauth auto-google only when google enabled', () => {
    const platform = resolvePlatformConfig(
      (key) => {
        if (key === 'AUTH_OAUTH_AUTO_GOOGLE') return 'true';
        if (key === 'AUTH_OAUTH_GOOGLE') return 'false';
        return undefined;
      },
      { MODE: 'test', DEV: true, PROD: false },
    );
    expect(platform.authMethods.oauthAutoGoogle).toBe(false);
  });

  it('strips trailing slashes from apiBaseUrl so path joins never double up', () => {
    const platform = resolvePlatformConfig(
      (key) => (key === 'API_BASE_URL' ? 'https://api.example.com//' : undefined),
      { MODE: 'production', DEV: false, PROD: true },
    );
    expect(platform.apiBaseUrl).toBe('https://api.example.com');
  });

  it('apiBaseUrl is purely env-driven — empty API_BASE_URL yields "" regardless of mode', () => {
    // No build-mode branch anymore: local dev proxies by setting VITE_API_BASE_URL=''.
    const platform = resolvePlatformConfig(() => undefined, {
      MODE: 'development',
      DEV: true,
      PROD: false,
    });
    expect(platform.apiBaseUrl).toBe('');
  });

  it('diagnostics/devtools/e2e default off and version-check on when unset', () => {
    const platform = resolvePlatformConfig(() => undefined, {
      MODE: 'production',
      DEV: false,
      PROD: true,
    });
    expect(platform.debugLogging).toBe(false);
    expect(platform.devtools).toBe(false);
    expect(platform.e2eHooks).toBe(false);
    expect(platform.versionCheckEnabled).toBe(true);
  });

  it('test mode (umbrella) forces devtools + e2e hooks on even when their flags are off', () => {
    const get = (key: string) => {
      if (key === 'TEST_MODE') return 'on';
      if (key === 'DEVTOOLS' || key === 'E2E_HOOKS') return 'false';
      return undefined;
    };
    const platform = resolvePlatformConfig(get, { MODE: 'development' });
    expect(platform.testMode).toBe(true);
    expect(platform.devtools).toBe(true);
    expect(platform.e2eHooks).toBe(true);
  });

  it('test mode defaults off and does not force the affordances', () => {
    const platform = resolvePlatformConfig(() => undefined, { MODE: 'development' });
    expect(platform.testMode).toBe(false);
    expect(platform.devtools).toBe(false);
    expect(platform.e2eHooks).toBe(false);
  });

  it('diagnostics flags flip from env values', () => {
    const values: Record<string, string> = {
      DEBUG_LOGGING: 'true',
      DEVTOOLS: 'true',
      E2E_HOOKS: 'true',
      VERSION_CHECK: 'false',
    };
    const platform = resolvePlatformConfig((key) => values[key], {
      MODE: 'development',
      DEV: true,
      PROD: false,
    });
    expect(platform.debugLogging).toBe(true);
    expect(platform.devtools).toBe(true);
    expect(platform.e2eHooks).toBe(true);
    expect(platform.versionCheckEnabled).toBe(false);
  });

  it('enabled oauth providers from env getters', () => {
    expect(
      __testEnabledOAuthFromGet((key) => {
        if (key === 'AUTH_OAUTH_GITHUB') return 'false';
        return undefined;
      }),
    ).toEqual(['google']);
  });
});

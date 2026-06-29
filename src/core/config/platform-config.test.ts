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

  it('enabled oauth providers from env getters', () => {
    expect(
      __testEnabledOAuthFromGet((key) => {
        if (key === 'AUTH_OAUTH_GITHUB') return 'false';
        return undefined;
      }),
    ).toEqual(['google']);
  });
});

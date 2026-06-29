import { describe, expect, it } from 'vitest';

import {
  enabledOAuthProviders,
  hasAnyAuthSurface,
  resolveAuthMethodFlag,
  resolveDeploymentOverride,
  resolveDisabledModules,
  resolveOAuthProviderFlags,
} from './env-resolvers.ts';

describe('env-resolvers', () => {
  it('resolveAuthMethodFlag treats omitted as default', () => {
    expect(resolveAuthMethodFlag(undefined, true)).toBe(true);
    expect(resolveAuthMethodFlag(undefined, false)).toBe(false);
    expect(resolveAuthMethodFlag('false', true)).toBe(false);
    expect(resolveAuthMethodFlag('true', false)).toBe(true);
  });

  it('resolveDisabledModules parses comma list', () => {
    expect(resolveDisabledModules('billing, webhooks')).toEqual(
      new Set(['billing', 'webhooks']),
    );
  });

  it('resolveOAuthProviderFlags defaults apple off', () => {
    const flags = resolveOAuthProviderFlags(() => undefined);
    expect(flags.google).toBe(true);
    expect(flags.github).toBe(true);
    expect(flags.apple).toBe(false);
  });

  it('enabledOAuthProviders filters by env flags', () => {
    const oauth = { google: true, github: false, apple: true };
    expect(enabledOAuthProviders(oauth)).toEqual(['google', 'apple']);
  });

  it('hasAnyAuthSurface detects when all off', () => {
    expect(
      hasAnyAuthSurface({
        email: false,
        passkey: false,
        oauth: { google: false, github: false, apple: false },
      }),
    ).toBe(false);
  });

  it('resolveDeploymentOverride is tri-state', () => {
    expect(resolveDeploymentOverride(undefined)).toBeNull();
    expect(resolveDeploymentOverride('true')).toBe(true);
    expect(resolveDeploymentOverride('false')).toBe(false);
  });
});

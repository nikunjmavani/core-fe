import {
  assertAuthPlatformInvariants,
  branchEnvironmentMap,
  type DeployEnvironment,
  environmentForBranch,
  envProfiles,
  envSchemaConditionallyRequiredKeys,
  envSchemaKeys,
  type ForbiddenKeyRule,
} from './env-schema.ts';

/** Mirrors the validator's forbidden matcher (tooling/validate/client-env.ts). */
function isForbidden(rule: ForbiddenKeyRule, value: string): boolean {
  return rule.valuePattern ? rule.valuePattern.test(value) : true;
}

function forbiddenHits(
  environment: DeployEnvironment,
  committed: Record<string, string>,
): string[] {
  return envProfiles[environment].forbidden
    .filter((rule) => {
      const value = committed[rule.key];
      return value !== undefined && isForbidden(rule, value);
    })
    .map((rule) => rule.key);
}

describe('environmentForBranch', () => {
  it('maps deploying branches to their environment', () => {
    expect(environmentForBranch('dev')).toBe('development');
    expect(environmentForBranch('main')).toBe('production');
  });

  it('returns undefined for feature branches and missing input', () => {
    expect(environmentForBranch('feature/foo')).toBeUndefined();
    expect(environmentForBranch(undefined)).toBeUndefined();
    expect(environmentForBranch('')).toBeUndefined();
  });

  it('stays in lock step with branchEnvironmentMap', () => {
    expect(branchEnvironmentMap).toEqual({ dev: 'development', main: 'production' });
  });
});

describe('envProfiles forbidden keys', () => {
  it('blocks local-only Sonar secrets in every environment', () => {
    for (const environment of ['development', 'production'] as const) {
      expect(forbiddenHits(environment, { SONAR_TOKEN: 'x' })).toContain('SONAR_TOKEN');
      expect(forbiddenHits(environment, { SONAR_ADMIN_PASSWORD: 'x' })).toContain(
        'SONAR_ADMIN_PASSWORD',
      );
    }
  });

  it('blocks a test Stripe key in production but allows a live key', () => {
    expect(
      forbiddenHits('production', { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_1' }),
    ).toContain('VITE_STRIPE_PUBLISHABLE_KEY');
    expect(
      forbiddenHits('production', { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_1' }),
    ).toEqual([]);
  });

  it('blocks a live Stripe key in development but allows a test key', () => {
    expect(
      forbiddenHits('development', { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_1' }),
    ).toContain('VITE_STRIPE_PUBLISHABLE_KEY');
    expect(
      forbiddenHits('development', { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_1' }),
    ).toEqual([]);
  });
});

describe('envProfiles required keys', () => {
  it('requires Turnstile in production only when captcha is enabled', () => {
    const rule = envProfiles.production.required.find(
      (r) => r.key === 'VITE_TURNSTILE_SITE_KEY',
    );
    expect(rule).toBeDefined();
    expect(rule?.level).toBe('error');
    expect(rule?.when?.(() => undefined)).toBe(true);
    expect(
      rule?.when?.((key) => (key === 'VITE_CAPTCHA_DISABLED' ? 'true' : undefined)),
    ).toBe(false);
  });

  it('derives the conditionally-required list from the production profile', () => {
    const keys = envSchemaConditionallyRequiredKeys.map((entry) => entry.key);
    expect(keys).toEqual(['VITE_TURNSTILE_SITE_KEY', 'VITE_API_BASE_URL']);
    for (const entry of envSchemaConditionallyRequiredKeys) {
      expect(entry.condition.length).toBeGreaterThan(0);
    }
  });
});

describe('envProfiles allowed values (strict per-environment)', () => {
  it('production permits only the safe value for each diagnostics flag', () => {
    const allowed = envProfiles.production.allowed;
    expect(allowed).toBeDefined();
    expect(allowed?.VITE_DEBUG_LOGGING).toEqual(['false']);
    expect(allowed?.VITE_DEVTOOLS).toEqual(['false']);
    expect(allowed?.VITE_E2E_HOOKS).toEqual(['false']);
    expect(allowed?.VITE_VERSION_CHECK).toEqual(['true']);
  });

  it('development permits either boolean value for diagnostics flags', () => {
    const allowed = envProfiles.development.allowed;
    expect(allowed?.VITE_DEBUG_LOGGING).toEqual(['true', 'false']);
    expect(allowed?.VITE_DEVTOOLS).toEqual(['true', 'false']);
    expect(allowed?.VITE_E2E_HOOKS).toEqual(['true', 'false']);
    expect(allowed?.VITE_VERSION_CHECK).toEqual(['true', 'false']);
  });

  it('rejects a disallowed production value (mirrors the validator check)', () => {
    const debug = envProfiles.production.allowed?.VITE_DEBUG_LOGGING ?? [];
    expect(debug.includes('true')).toBe(false);
    expect(debug.includes('false')).toBe(true);
    const versionCheck = envProfiles.production.allowed?.VITE_VERSION_CHECK ?? [];
    expect(versionCheck.includes('false')).toBe(false);
    expect(versionCheck.includes('true')).toBe(true);
  });
});

describe('assertAuthPlatformInvariants', () => {
  it('does not throw when no auth surface is enabled (runs the warn path)', () => {
    const allAuthOff = (key: string) => (key.startsWith('AUTH_') ? 'false' : undefined);
    expect(() => assertAuthPlatformInvariants(allAuthOff)).not.toThrow();
  });

  it('throws when auto-google is on but google is off', () => {
    const get = (key: string) => {
      if (key === 'AUTH_OAUTH_AUTO_GOOGLE') return 'true';
      if (key === 'AUTH_OAUTH_GOOGLE') return 'false';
      return undefined;
    };
    expect(() => assertAuthPlatformInvariants(get)).toThrow(/AUTO_GOOGLE/);
  });
});

describe('envSchemaKeys', () => {
  it('includes the Stripe publishable key', () => {
    expect(envSchemaKeys).toContain('VITE_STRIPE_PUBLISHABLE_KEY');
  });

  it('includes the local Sonar tooling secrets', () => {
    expect(envSchemaKeys).toContain('SONAR_TOKEN');
    expect(envSchemaKeys).toContain('SONAR_ADMIN_PASSWORD');
  });
});
